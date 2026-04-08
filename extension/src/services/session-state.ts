import * as fs from 'node:fs';
import * as path from 'node:path';

import type { State } from '../types/index.js';

export type SessionsMap = Record<string, string>;

function normalizePath(input: string): string {
  return path.resolve(input);
}

function toInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function atomicWriteJson(filePath: string, payload: unknown): void {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function getSessionsMapPath(extensionRoot: string): string {
  return path.join(extensionRoot, 'current_sessions.json');
}

export function loadSessionsMap(extensionRoot: string): SessionsMap {
  const mapPath = getSessionsMapPath(extensionRoot);
  if (!fs.existsSync(mapPath)) {
    return {};
  }

  try {
    const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }

    const normalized: SessionsMap = {};
    for (const [cwd, sessionPath] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof cwd !== 'string' || typeof sessionPath !== 'string') {
        continue;
      }
      normalized[normalizePath(cwd)] = sessionPath;
    }

    return normalized;
  } catch {
    return {};
  }
}

export function saveSessionsMap(extensionRoot: string, map: SessionsMap): void {
  atomicWriteJson(getSessionsMapPath(extensionRoot), map);
}

export function setSessionForCwd(
  extensionRoot: string,
  cwd: string,
  sessionPath: string,
  workingDir?: string
): void {
  const map = loadSessionsMap(extensionRoot);
  const normalizedSessionPath = normalizePath(sessionPath);

  map[normalizePath(cwd)] = normalizedSessionPath;
  if (workingDir) {
    map[normalizePath(workingDir)] = normalizedSessionPath;
  }

  saveSessionsMap(extensionRoot, map);
}

export function findMappedSessionPath(map: SessionsMap, cwd: string): string | null {
  const normalizedCwd = normalizePath(cwd);

  const directHit = map[normalizedCwd];
  if (directHit && fs.existsSync(directHit)) {
    return directHit;
  }

  let bestMatch: string | null = null;
  let bestPrefixLength = -1;

  for (const [mappedCwd, sessionPath] of Object.entries(map)) {
    if (!sessionPath || !fs.existsSync(sessionPath)) {
      continue;
    }

    const normalizedMapped = normalizePath(mappedCwd);
    const isAncestor =
      normalizedCwd === normalizedMapped ||
      normalizedCwd.startsWith(`${normalizedMapped}${path.sep}`);

    if (!isAncestor) {
      continue;
    }

    if (normalizedMapped.length > bestPrefixLength) {
      bestPrefixLength = normalizedMapped.length;
      bestMatch = sessionPath;
    }
  }

  return bestMatch;
}

export function resolveSessionPath(extensionRoot: string, cwd: string): string | null {
  const map = loadSessionsMap(extensionRoot);
  return findMappedSessionPath(map, cwd);
}

export function findLatestSessionForCwd(extensionRoot: string, cwd: string): string | null {
  const sessionsRoot = path.join(extensionRoot, 'sessions');
  if (!fs.existsSync(sessionsRoot)) {
    return null;
  }

  let latestSessionPath: string | null = null;
  let latestMtimeMs = -1;

  for (const entry of fs.readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sessionPath = path.join(sessionsRoot, entry.name);
    const statePath = path.join(sessionPath, 'state.json');
    if (!fs.existsSync(statePath)) {
      continue;
    }

    const state = readStateFile(statePath);
    if (!state) {
      continue;
    }

    if (!isSamePathOrDescendant(cwd, state.working_dir)) {
      continue;
    }

    let mtimeMs = -1;
    try {
      mtimeMs = fs.statSync(statePath).mtimeMs;
    } catch {
      // Ignore stat errors.
    }

    if (mtimeMs > latestMtimeMs) {
      latestMtimeMs = mtimeMs;
      latestSessionPath = sessionPath;
    }
  }

  return latestSessionPath;
}

export function resolveStateFilePath(
  extensionRoot: string,
  cwd: string,
  stateFileOverride?: string
): string | null {
  if (stateFileOverride) {
    const candidate = normalizePath(stateFileOverride);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const sessionPath = resolveSessionPath(extensionRoot, cwd);
  if (!sessionPath) {
    return null;
  }

  const stateFile = path.join(sessionPath, 'state.json');
  if (!fs.existsSync(stateFile)) {
    return null;
  }

  return stateFile;
}

export function readStateFile(stateFile: string): State | null {
  if (!fs.existsSync(stateFile)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as Record<string, unknown>;

    const state: State = {
      active: Boolean(raw.active),
      working_dir: typeof raw.working_dir === 'string' ? raw.working_dir : process.cwd(),
      step: typeof raw.step === 'string' ? raw.step : 'prd',
      iteration: toInt(raw.iteration, 0),
      max_iterations: toInt(raw.max_iterations, 0),
      max_time_minutes: toInt(raw.max_time_minutes, 0),
      worker_timeout_seconds: toInt(raw.worker_timeout_seconds, 1200),
      start_time_epoch: toInt(raw.start_time_epoch, Math.floor(Date.now() / 1000)),
      completion_promise:
        raw.completion_promise == null ? null : String(raw.completion_promise),
      original_prompt: typeof raw.original_prompt === 'string' ? raw.original_prompt : '',
      current_ticket: raw.current_ticket == null ? null : String(raw.current_ticket),
      history: Array.isArray(raw.history) ? raw.history : [],
      started_at: typeof raw.started_at === 'string' ? raw.started_at : new Date().toISOString(),
      session_dir:
        typeof raw.session_dir === 'string' ? raw.session_dir : path.dirname(normalizePath(stateFile)),
      jar_complete: raw.jar_complete === true,
      worker: raw.worker === true,
    };

    return state;
  } catch {
    return null;
  }
}

export function writeStateFile(stateFile: string, state: State): void {
  atomicWriteJson(stateFile, state);
}

export function isSamePathOrDescendant(candidatePath: string, basePath: string): boolean {
  const candidate = normalizePath(candidatePath);
  const base = normalizePath(basePath);
  return candidate === base || candidate.startsWith(`${base}${path.sep}`);
}

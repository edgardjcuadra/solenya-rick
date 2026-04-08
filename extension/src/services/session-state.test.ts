import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  findLatestSessionForCwd,
  findMappedSessionPath,
  isSamePathOrDescendant,
  loadSessionsMap,
  readStateFile,
  resolveSessionPath,
  resolveStateFilePath,
  setSessionForCwd,
  writeStateFile,
} from './session-state.js';

const tempRoots: string[] = [];

function mkTempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pickle-rick-ext-test-'));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('session-state utilities', () => {
  it('finds longest ancestor mapping for nested cwd', () => {
    const root = mkTempRoot();
    const sessionA = path.join(root, 'sessions', 'a');
    const sessionB = path.join(root, 'sessions', 'b');
    fs.mkdirSync(sessionA, { recursive: true });
    fs.mkdirSync(sessionB, { recursive: true });

    const map = {
      '/repo': sessionA,
      '/repo/apps': sessionB,
    };
    const session = findMappedSessionPath(map, '/repo/apps/web/src');
    expect(session).toBe(sessionB);
  });

  it('writes and resolves session mapping for cwd', () => {
    const root = mkTempRoot();
    const repoRoot = path.join(root, 'repo');
    const nested = path.join(repoRoot, 'a', 'b');
    const sessionDir = path.join(root, 'sessions', 'test-session');

    fs.mkdirSync(nested, { recursive: true });
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, 'state.json'), '{}', 'utf8');

    setSessionForCwd(root, repoRoot, sessionDir);

    const loaded = loadSessionsMap(root);
    expect(Object.keys(loaded)).toHaveLength(1);
    expect(resolveSessionPath(root, nested)).toBe(sessionDir);
  });

  it('uses state file override when provided', () => {
    const root = mkTempRoot();
    const override = path.join(root, 'override-state.json');
    fs.writeFileSync(override, '{}', 'utf8');

    const resolved = resolveStateFilePath(root, '/repo', override);
    expect(resolved).toBe(path.resolve(override));
  });

  it('normalizes partial state with defaults', () => {
    const root = mkTempRoot();
    const sessionDir = path.join(root, 'sessions', 'partial');
    const statePath = path.join(sessionDir, 'state.json');
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(
      statePath,
      JSON.stringify({ active: true, working_dir: '/repo', step: 'prd' }, null, 2),
      'utf8'
    );

    const state = readStateFile(statePath);
    expect(state).not.toBeNull();
    expect(state?.iteration).toBe(0);
    expect(state?.max_iterations).toBe(0);
    expect(state?.session_dir).toBe(sessionDir);
  });

  it('writes state atomically and reads it back', () => {
    const root = mkTempRoot();
    const statePath = path.join(root, 'sessions', 'atomic', 'state.json');
    const expected = {
      active: true,
      working_dir: '/repo',
      step: 'prd',
      iteration: 0,
      max_iterations: 10,
      max_time_minutes: 60,
      worker_timeout_seconds: 1200,
      start_time_epoch: 1,
      completion_promise: null,
      original_prompt: 'x',
      current_ticket: null,
      history: [],
      started_at: '2026-01-01T00:00:00Z',
      session_dir: path.dirname(statePath),
    };

    writeStateFile(statePath, expected);
    const roundTrip = readStateFile(statePath);
    expect(roundTrip?.original_prompt).toBe('x');
  });

  it('checks path descendants correctly', () => {
    expect(isSamePathOrDescendant('/repo/a/b', '/repo')).toBe(true);
    expect(isSamePathOrDescendant('/repo-two', '/repo')).toBe(false);
  });

  it('finds latest matching session when map entry is missing', () => {
    const root = mkTempRoot();
    const sessionsRoot = path.join(root, 'sessions');
    const oldSession = path.join(sessionsRoot, 'old');
    const newSession = path.join(sessionsRoot, 'new');
    fs.mkdirSync(oldSession, { recursive: true });
    fs.mkdirSync(newSession, { recursive: true });

    const oldStatePath = path.join(oldSession, 'state.json');
    const newStatePath = path.join(newSession, 'state.json');

    fs.writeFileSync(
      oldStatePath,
      JSON.stringify({ active: true, working_dir: '/repo', step: 'prd' }, null, 2),
      'utf8'
    );
    fs.writeFileSync(
      newStatePath,
      JSON.stringify({ active: true, working_dir: '/repo', step: 'plan' }, null, 2),
      'utf8'
    );

    const now = Date.now();
    fs.utimesSync(oldStatePath, now / 1000 - 10, now / 1000 - 10);
    fs.utimesSync(newStatePath, now / 1000, now / 1000);

    expect(findLatestSessionForCwd(root, '/repo/subdir')).toBe(newSession);
  });
});

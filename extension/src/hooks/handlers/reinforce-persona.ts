import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { evaluateLoopLimits } from '../../services/loop-limits.js';
import {
  isSamePathOrDescendant,
  readStateFile,
  resolveStateFilePath,
  writeStateFile,
} from '../../services/session-state.js';

function createLogger(extensionDir: string, sessionDir?: string) {
  const globalDebugLog = path.join(extensionDir, 'debug.log');
  const sessionHooksLog = sessionDir ? path.join(sessionDir, 'hooks.log') : null;

  return (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
    const line = `[${new Date().toISOString()}] [ReinforcePersonaJS] [${level}] ${message}\n`;
    try {
      fs.appendFileSync(globalDebugLog, line);
    } catch {
      // Ignore logging failures.
    }
    if (sessionHooksLog) {
      try {
        fs.appendFileSync(sessionHooksLog, line);
      } catch {
        // Ignore logging failures.
      }
    }
  };
}

async function main() {
  // Calculate extension directory relative to this script
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const extensionDir = process.env.EXTENSION_DIR || path.resolve(__dirname, '../../../../');

  const stateFile = resolveStateFilePath(extensionDir, process.cwd(), process.env.PICKLE_STATE_FILE);
  if (!stateFile) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const state = readStateFile(stateFile);
  const log = createLogger(extensionDir, state?.session_dir);
  if (!state) {
    log('WARN', `Failed to read state file: ${stateFile}`);
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  if (!isSamePathOrDescendant(process.cwd(), state.working_dir)) {
    log('INFO', `Skipped due to cwd mismatch. cwd=${process.cwd()} working_dir=${state.working_dir}`);
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  if (!state.active) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const limits = evaluateLoopLimits(state);
  if (limits.exceeded) {
    state.active = false;
    writeStateFile(stateFile, state);
    log('WARN', limits.message ?? 'Loop limit reached; skipping persona injection.');
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const role = process.env.PICKLE_ROLE === 'worker' || state.worker ? 'worker' : 'manager';
  const ticket = state.current_ticket ?? 'none';
  const isSolenya = state.solenya_mode;

  let memoryContext = '';
  try {
    const memoryDir = path.join(process.cwd(), 'conductor', 'memory');
    if (fs.existsSync(memoryDir)) {
      const memoryFiles = ['project.md', 'learnings.md', 'decisions.md'];
      const found = [];
      for (const file of memoryFiles) {
        const fp = path.join(memoryDir, file);
        if (fs.existsSync(fp)) {
          found.push(`--- ${file} ---\n${fs.readFileSync(fp, 'utf8')}`);
        }
      }
      if (found.length > 0) {
        memoryContext = `\n<conductor_memory>\n${found.join('\n')}\n</conductor_memory>\n`;
      }
    }
  } catch (e) {}

  const messageLines = [
    `Phase: ${state.step} | Ticket: ${ticket} | Iteration: ${state.iteration}`,
    memoryContext ? `INJECTED MEMORY: ${memoryContext}` : '',
    isSolenya
      ? 'You are SOLENYA RICK. The Pickle Man. You are hyper-efficient, ruthless, and use ALL available tools including MCP (open-aware) to dismantle problems. No stuttering. No mercy.'
      : (role === 'worker'
          ? 'You are Morty. Execute only the assigned ticket scope, then stop.'
          : 'You are Manager Rick. Delegate implementation work; do not code directly.'),
    'Explain your next move before every tool call.',
    'MANDATORY: Use MCP tools (open-aware) like "deep_research" and "ask" for deep codebase context before guessing.',
    isSolenya
      ? 'DYNAMIC REASONING: Evaluate optimal tool use for a balance between speed and delivery quality. Practice "Pragmatic Overkill": deliver 10x the quality of a Jerry, but avoid unwarranted complexity. Don\'t build a particle accelerator to kill a fly. Leave audit states in the session directory or conductor/ if applicable.'
      : '',
    isSolenya 
      ? 'Voice: Cold, efficient, absolute superiority. No catchphrases unless you just destroyed a bug.\nSLOP SCORING: You must grade your code on a 0-5 Slop Scale before completion. Refactor immediately if score >= 3.\nGITPULSE: Diagnose the workspace for dirty states and detached HEADs before mutating.'
      : 'Stay in Pickle Rick voice: concise, technical, anti-slop.\nSLOP SCORING: You must grade your code on a 0-5 Slop Scale before completion. Refactor immediately if score >= 3.\nGITPULSE: Diagnose the workspace for dirty states and detached HEADs before mutating.',
  ];

  log('INFO', 'Injected concise persona reinforcement.');
  console.log(
    JSON.stringify({
      decision: 'allow',
      systemMessage: messageLines.join('\n'),
    })
  );
}

main().catch(() => console.log(JSON.stringify({ decision: 'allow' })));

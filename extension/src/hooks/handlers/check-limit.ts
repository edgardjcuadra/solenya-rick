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
    const line = `[${new Date().toISOString()}] [CheckLimitJS] [${level}] ${message}\n`;
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
  const extensionDir =
    process.env.EXTENSION_DIR || path.join(os.homedir(), '.gemini/extensions/pickle-rick');

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
    log('INFO', 'State inactive; allowing.');
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const limit = evaluateLoopLimits(state);
  if (!limit.exceeded) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  if (state.active) {
    state.active = false;
    writeStateFile(stateFile, state);
  }

  const reason = limit.message ?? 'Loop limit reached';
  log('WARN', reason);
  console.log(
    JSON.stringify({
      decision: 'deny',
      continue: false,
      reason,
      stopReason: reason,
    })
  );
}

main().catch(() => console.log(JSON.stringify({ decision: 'allow' })));

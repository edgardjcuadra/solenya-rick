import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

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
    const line = `[${new Date().toISOString()}] [IncrementIterationJS] [${level}] ${message}\n`;
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

  const role = process.env.PICKLE_ROLE;
  if (state.active && role !== 'worker') {
    state.iteration = (state.iteration || 0) + 1;
    writeStateFile(stateFile, state);
    log('INFO', `Incremented iteration to ${state.iteration}`);
  } else {
    log('INFO', `No increment. active=${state.active} role=${role ?? 'unknown'}`);
  }

  console.log(JSON.stringify({ decision: 'allow' }));
}

main().catch(() => console.log(JSON.stringify({ decision: 'allow' })));

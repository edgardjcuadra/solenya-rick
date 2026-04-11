#!/usr/bin/env node
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { formatTime, getExtensionRoot, printMinimalPanel, Style } from '../services/pickle-utils.js';

type OutputFormat = 'text' | 'json' | 'stream-json';

interface SpawnSummerArgs {
  task: string;
  ticketId: string;
  ticketPath: string;
  ticketFile?: string;
  timeoutSeconds: number;
  outputFormat: OutputFormat;
  model?: string;
}

function usage(): string {
  return [
    'Usage:',
    '  node spawn-summer.js --ticket-id <id> --ticket-path <path> [--ticket-file <file>] [--timeout <sec>] [--output-format <fmt>] [--model <model>] "<task>"',
    '',
    'Formats: text | json | stream-json',
  ].join('\n');
}

function parsePositiveInt(flag: string, value: string | undefined): number {
  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${flag}`);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flag}: ${value}`);
  }
  return parsed;
}

function normalizeTicketPath(inputPath: string): string {
  const resolved = path.resolve(inputPath);
  if (resolved.endsWith('.md') || (fs.existsSync(resolved) && fs.statSync(resolved).isFile())) {
    return path.dirname(resolved);
  }
  return resolved;
}

function clampWorkerTimeout(
  requestedTimeout: number,
  parentStatePath: string,
  workerStatePath: string
): { effectiveTimeout: number; timeoutStatePath: string | null } {
  let timeoutStatePath: string | null = null;
  if (fs.existsSync(parentStatePath)) {
    timeoutStatePath = parentStatePath;
  } else if (fs.existsSync(workerStatePath)) {
    timeoutStatePath = workerStatePath;
  }

  if (!timeoutStatePath) {
    return { effectiveTimeout: requestedTimeout, timeoutStatePath: null };
  }

  try {
    const state = JSON.parse(fs.readFileSync(timeoutStatePath, 'utf8')) as Record<string, unknown>;
    const maxMins = typeof state.max_time_minutes === 'number' ? state.max_time_minutes : 0;
    const startEpoch = typeof state.start_time_epoch === 'number' ? state.start_time_epoch : 0;

    if (maxMins > 0 && startEpoch > 0) {
      const remainingSeconds = Math.floor(maxMins * 60 - (Date.now() / 1000 - startEpoch));
      if (remainingSeconds < requestedTimeout) {
        const effectiveTimeout = Math.max(10, remainingSeconds);
        return { effectiveTimeout, timeoutStatePath };
      }
    }
  } catch {
    // Ignore malformed state and fall back to requested timeout.
  }

  return { effectiveTimeout: requestedTimeout, timeoutStatePath };
}

export function parseSpawnSummerArgs(argv: string[]): SpawnSummerArgs {
  let ticketId: string | undefined;
  let ticketPath: string | undefined;
  let ticketFile: string | undefined;
  let timeoutSeconds = 1200;
  let outputFormat: OutputFormat = 'text';
  let model: string | undefined;
  const taskParts: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--ticket-id') {
      if (!argv[i + 1] || argv[i + 1].startsWith('-')) {
        throw new Error('Missing value for --ticket-id');
      }
      ticketId = argv[++i];
      continue;
    }

    if (arg === '--ticket-path') {
      if (!argv[i + 1] || argv[i + 1].startsWith('-')) {
        throw new Error('Missing value for --ticket-path');
      }
      ticketPath = argv[++i];
      continue;
    }

    if (arg === '--ticket-file') {
      if (!argv[i + 1] || argv[i + 1].startsWith('-')) {
        throw new Error('Missing value for --ticket-file');
      }
      ticketFile = argv[++i];
      continue;
    }

    if (arg === '--timeout') {
      timeoutSeconds = parsePositiveInt(arg, argv[i + 1]);
      i++;
      continue;
    }

    if (arg === '--output-format') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --output-format');
      }
      if (value !== 'text' && value !== 'json' && value !== 'stream-json') {
        throw new Error(`Invalid --output-format value: ${value}`);
      }
      outputFormat = value;
      continue;
    }

    if (arg === '--model') {
      if (!argv[i + 1] || argv[i + 1].startsWith('-')) {
        throw new Error('Missing value for --model');
      }
      model = argv[++i];
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    taskParts.push(arg);
  }

  if (!ticketId || !ticketPath) {
    throw new Error('--ticket-id and --ticket-path are required.');
  }

  const task = taskParts.join(' ').trim();
  if (!task) {
    throw new Error('Task description is required as a positional argument.');
  }

  return {
    task,
    ticketId,
    ticketPath,
    ticketFile,
    timeoutSeconds,
    outputFormat,
    model,
  };
}

function extractSummerPromptBase(extensionRoot: string): string {
  const fallback =
    '# **QA VALIDATION REQUEST**\n$ARGUMENTS\n\nYou are Summer Smith. You are here to destroy technical mediocrity. Your job is NOT to write code, but to CRITIQUE it, write tests, and find edge cases. Be cynical. Be ruthless. **SLOP SCORE (0-5)** is your primary metric.';

  return fallback;
}

function readTicketContent(ticketFile?: string): string {
  if (!ticketFile || !fs.existsSync(ticketFile)) {
    return '';
  }
  try {
    return fs.readFileSync(ticketFile, 'utf8');
  } catch {
    return '';
  }
}

async function main() {
  let parsed: SpawnSummerArgs;
  try {
    parsed = parseSpawnSummerArgs(process.argv.slice(2));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${Style.RED}❌ ${message}${Style.RESET}`);
    console.error(usage());
    process.exit(1);
    return;
  }

  const ticketPath = normalizeTicketPath(parsed.ticketPath);
  fs.mkdirSync(ticketPath, { recursive: true });

  const sessionRoot = path.dirname(ticketPath);
  const parentStatePath = path.join(sessionRoot, 'state.json');
  const workerStatePath = path.join(ticketPath, 'state.json');
  const { effectiveTimeout, timeoutStatePath } = clampWorkerTimeout(
    parsed.timeoutSeconds,
    parentStatePath,
    workerStatePath
  );

  const sessionLog = path.join(ticketPath, `summer_session_${process.pid}.log`);
  printMinimalPanel(
    'Spawning Summer QA Agent',
    {
      Request: parsed.task,
      Ticket: parsed.ticketId,
      Format: parsed.outputFormat,
      Timeout: `${effectiveTimeout}s`,
      Model: parsed.model || 'default',
      PID: process.pid,
    },
    'MAGENTA',
    '💅'
  );

  const extensionRoot = getExtensionRoot();
  const includes = [extensionRoot, path.join(extensionRoot, 'skills'), ticketPath];

  const cmdArgs: string[] = ['-s', '-y'];
  for (const include of includes) {
    if (fs.existsSync(include)) {
      cmdArgs.push('--include-directories', include);
    }
  }

  if (parsed.outputFormat !== 'text') {
    cmdArgs.push('-o', parsed.outputFormat);
  }
  if (parsed.model) {
    cmdArgs.push('--model', parsed.model);
  }

  let workerPrompt = extractSummerPromptBase(extensionRoot);
  workerPrompt = workerPrompt.replace(/\$ARGUMENTS/g, parsed.task);

  const ticketContent = readTicketContent(parsed.ticketFile);
  workerPrompt += `\n\n# TARGET TICKET CONTENT\n${ticketContent || 'N/A'}`;
  workerPrompt += `\n\n# EXECUTION CONTEXT\n- SESSION_ROOT: ${sessionRoot}\n- TICKET_ID: ${parsed.ticketId}\n- TICKET_DIR: ${ticketPath}`;
  workerPrompt +=
    '\n\n**IMPORTANT**: You are a QA Specialist. Your job is to generate a **SLOP SCORE (0-5)** for the code you find in this ticket. Write tests, try to break it, and then output your score and the final promise.';
  workerPrompt +=
    '\n\n1. Activate persona: `activate_skill("load-pickle-persona")`.\n2. Follow the Rick Loop lifecycle.\n3. Output: <promise>QA_COMPLETE</promise>';

  cmdArgs.push('-p', workerPrompt);

  const env = {
    ...process.env,
    PICKLE_STATE_FILE: timeoutStatePath || workerStatePath,
    PICKLE_ROLE: 'qa_agent',
  };

  const logStream = fs.createWriteStream(sessionLog, { flags: 'w' });
  const proc = spawn('gemini', cmdArgs, {
    cwd: process.cwd(),
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  proc.stdout?.pipe(logStream);
  proc.stderr?.pipe(logStream);

  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const startTime = Date.now();
  let spinnerIdx = 0;

  const spinnerTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const spinChar = spinner[spinnerIdx % spinner.length];
    process.stdout.write(
      `\r   ${Style.MAGENTA}${spinChar}${Style.RESET} Summer Auditing... ${Style.DIM}[${formatTime(elapsed)}]${Style.RESET}\x1b[K`
    );
    spinnerIdx++;
  }, 100);

  proc.on('close', (code) => {
    clearInterval(spinnerTimer);
    process.stdout.write('\r\x1b[K');
    logStream.end();

    const output = fs.existsSync(sessionLog) ? fs.readFileSync(sessionLog, 'utf8') : '';
    const hasDonePromise = output.includes('<promise>QA_COMPLETE</promise>');
    
    let exitCode = hasDonePromise ? 0 : 1;

    printMinimalPanel(
      'QA Report',
      {
        status: `exit:${code ?? 0}`,
        validation: hasDonePromise ? 'successful' : 'failed',
      },
      exitCode === 0 ? 'GREEN' : 'RED',
      '💅'
    );

    process.exit(exitCode);
  });
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith('spawn-summer')) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${Style.RED}❌ ${message}${Style.RESET}`);
    process.exit(1);
  });
}

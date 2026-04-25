import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

import { evaluateLoopLimits } from '../../services/loop-limits.js';
import {
  isSamePathOrDescendant,
  readStateFile,
  resolveStateFilePath,
  writeStateFile,
} from '../../services/session-state.js';
import type { HookInput } from '../../types/index.js';

function notify(title: string, message: string): void {
  if (process.platform !== 'win32') return;
  try {
    const psCommand = `[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]; $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $textNodes = $template.GetElementsByTagName('text'); $textNodes.Item(0).AppendChild($template.CreateTextNode('${title}')) > $null; $textNodes.Item(1).AppendChild($template.CreateTextNode('${message}')) > $null; $toast = [Windows.UI.Notifications.ToastNotification]::new($template); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Gemini CLI').Show($toast);`;
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, {
      stdio: 'ignore',
    });
  } catch {
    // Ignore notification failures
  }
}

function createLogger(extensionDir: string, sessionDir?: string) {
  const globalDebugLog = path.join(extensionDir, 'debug.log');
  const sessionHooksLog = sessionDir ? path.join(sessionDir, 'hooks.log') : null;

  return (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
    const line = `[${new Date().toISOString()}] [StopHookJS] [${level}] ${message}\n`;
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

function allow(): void {
  console.log(JSON.stringify({ decision: 'allow' }));
}

function block(message: string): void {
  console.log(
    JSON.stringify({
      decision: 'block',
      systemMessage: message,
      hookSpecificOutput: {
        hookEventName: 'AfterAgent',
      },
    })
  );
}

function readHookInput(): HookInput {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return JSON.parse(raw || '{}') as HookInput;
  } catch {
    return {};
  }
}

async function main() {
  // Calculate extension directory relative to this script
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const extensionDir = process.env.EXTENSION_DIR || path.resolve(__dirname, '../../../../');
  const input = readHookInput();

  const stateFile = resolveStateFilePath(extensionDir, process.cwd(), process.env.PICKLE_STATE_FILE);
  if (!stateFile) {
    allow();
    return;
  }

  const state = readStateFile(stateFile);
  const log = createLogger(extensionDir, state?.session_dir);
  if (!state) {
    log('WARN', `Failed to read state file: ${stateFile}`);
    allow();
    return;
  }

  if (!isSamePathOrDescendant(process.cwd(), state.working_dir)) {
    log('INFO', `Skipped due to cwd mismatch. cwd=${process.cwd()} working_dir=${state.working_dir}`);
    allow();
    return;
  }

  if (!state.active) {
    log('INFO', 'Session inactive; allowing stop.');
    allow();
    return;
  }

  const role = process.env.PICKLE_ROLE;
  const isWorker = role === 'worker' || state.worker === true;
  const responseText = input.prompt_response || '';

  const limits = evaluateLoopLimits(state);
  if (limits.exceeded) {
    state.active = false;
    writeStateFile(stateFile, state);
    log('WARN', limits.message ?? 'Loop limit reached.');
    notify('Pickle Rick Loop Stopped', limits.message ?? 'Loop limit reached.');
    allow();
    return;
  }

  const hasPromise =
    !!state.completion_promise &&
    responseText.includes(`<promise>${state.completion_promise}</promise>`);
  const isEpicDone = responseText.includes('<promise>EPIC_COMPLETED</promise>');
  const isTaskFinished = responseText.includes('<promise>TASK_COMPLETED</promise>');
  const isWorkerDone = isWorker && responseText.includes('<promise>I AM DONE</promise>');

  const isPrdDone = !isWorker && responseText.includes('<promise>PRD_COMPLETE</promise>');
  const isBreakdownDone = !isWorker && responseText.includes('<promise>BREAKDOWN_COMPLETE</promise>');
  const isTicketSelected = !isWorker && responseText.includes('<promise>TICKET_SELECTED</promise>');
  const isTicketDone = !isWorker && responseText.includes('<promise>TICKET_COMPLETE</promise>');
  const isTaskDone = !isWorker && responseText.includes('<promise>TASK_COMPLETE</promise>');
  const isRetryRequested = responseText.includes('[RETRY_ITERATION]');

  if (hasPromise || isEpicDone || isTaskFinished || isWorkerDone) {
    if (!isWorker) {
      state.active = false;
      writeStateFile(stateFile, state);
      notify(
        'Pickle Rick Loop Complete',
        'The autonomous engineering task has finished successfully.'
      );
    }
    log('INFO', 'Allowing stop due to completion token.');
    allow();
    return;
  }

  if (isPrdDone || isBreakdownDone || isTicketSelected || isTicketDone || isTaskDone || isRetryRequested) {
    let feedback = '🥒 Pickle Rick loop active.';
    if (isPrdDone) feedback = '🥒 PRD complete. Proceed to Breakdown.';
    if (isBreakdownDone) feedback = '🥒 Breakdown complete. Proceed to ticket execution.';
    if (isTicketSelected) feedback = '🥒 Ticket selected. Begin research.';
    if (isTicketDone || isTaskDone) feedback = '🥒 Ticket complete. Continue with validation or next ticket.';
    if (isRetryRequested) feedback = '🥒 SOLENYA REFLEXION: Potential slop or error detected. Retrying iteration with feedback.';
    log('INFO', `Blocking stop for checkpoint token. feedback="${feedback}"`);
    block(feedback);
    return;
  }

  const iterationSummary =
    state.max_iterations > 0
      ? `🥒 Pickle Rick loop active (Iteration ${state.iteration}/${state.max_iterations}).`
      : `🥒 Pickle Rick loop active (Iteration ${state.iteration}).`;

  log('INFO', 'Blocking stop by default (loop continues).');
  block(iterationSummary);
}

main().catch(() => allow());

#!/usr/bin/env node
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getExtensionRoot, printMinimalPanel, Style } from '../services/pickle-utils.js';
import { findLatestSessionForCwd, readStateFile, resolveSessionPath, setSessionForCwd, writeStateFile, } from '../services/session-state.js';
function die(message) {
    console.error(`${Style.RED}❌ Error: ${message}${Style.RESET}`);
    process.exit(1);
}
function resolvePath(input) {
    if (input.startsWith('~')) {
        return path.join(os.homedir(), input.slice(1));
    }
    return path.resolve(input);
}
function parseNumericFlag(flag, value) {
    if (!value || value.startsWith('-')) {
        throw new Error(`Missing value for ${flag}`);
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid value for ${flag}: ${value}`);
    }
    return parsed;
}
function sanitizeSessionName(name) {
    const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    if (!slug) {
        throw new Error('Invalid --name value. Use letters, numbers, dots, underscores, or hyphens.');
    }
    return slug;
}
export function parseSetupArgs(argv) {
    const parsed = {
        taskParts: [],
        resume: false,
        reset: false,
        paused: false,
        provided: {
            maxIterations: false,
            maxTime: false,
            workerTimeout: false,
            completionPromise: false,
        },
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--max-iterations') {
            parsed.maxIterations = parseNumericFlag(arg, argv[i + 1]);
            parsed.provided.maxIterations = true;
            i++;
            continue;
        }
        if (arg === '--max-time') {
            parsed.maxTime = parseNumericFlag(arg, argv[i + 1]);
            parsed.provided.maxTime = true;
            i++;
            continue;
        }
        if (arg === '--worker-timeout') {
            parsed.workerTimeout = parseNumericFlag(arg, argv[i + 1]);
            parsed.provided.workerTimeout = true;
            i++;
            continue;
        }
        if (arg === '--completion-promise') {
            const value = argv[i + 1];
            if (!value || value.startsWith('-')) {
                throw new Error('Missing value for --completion-promise');
            }
            parsed.completionPromise = value;
            parsed.provided.completionPromise = true;
            i++;
            continue;
        }
        if (arg === '--resume') {
            parsed.resume = true;
            if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
                parsed.resumePath = resolvePath(argv[i + 1]);
                i++;
            }
            continue;
        }
        if (arg === '--reset') {
            parsed.reset = true;
            continue;
        }
        if (arg === '--paused' || arg === '-paused') {
            parsed.paused = true;
            continue;
        }
        if (arg === '--name') {
            const value = argv[i + 1];
            if (!value || value.startsWith('-')) {
                throw new Error('Missing value for --name');
            }
            parsed.name = sanitizeSessionName(value);
            i++;
            continue;
        }
        if (arg === '-s' || arg === '--session-id') {
            // Ignore gemini-injected session id argument and consume its value.
            if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
                i++;
            }
            continue;
        }
        parsed.taskParts.push(arg);
    }
    return parsed;
}
function loadDefaults(extensionRoot) {
    const defaults = {
        loopLimit: 5,
        timeLimit: 60,
        workerTimeout: 1200,
    };
    const settingsFile = path.join(extensionRoot, 'pickle_settings.json');
    if (!fs.existsSync(settingsFile)) {
        return defaults;
    }
    try {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        if (typeof settings.default_max_iterations === 'number') {
            defaults.loopLimit = Math.max(0, Math.floor(settings.default_max_iterations));
        }
        if (typeof settings.default_max_time_minutes === 'number') {
            defaults.timeLimit = Math.max(0, Math.floor(settings.default_max_time_minutes));
        }
        if (typeof settings.default_worker_timeout_seconds === 'number') {
            defaults.workerTimeout = Math.max(0, Math.floor(settings.default_worker_timeout_seconds));
        }
    }
    catch {
        // Fall back to built-in defaults.
    }
    return defaults;
}
function ensureCoreDirs(extensionRoot) {
    for (const subDir of ['sessions', 'jar', 'worktrees']) {
        const target = path.join(extensionRoot, subDir);
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }
    }
}
function createSessionId(sessionsRoot, name) {
    const today = new Date().toISOString().split('T')[0];
    const defaultId = `${today}-${crypto.randomBytes(4).toString('hex')}`;
    if (!name) {
        return defaultId;
    }
    const base = `${today}-${name}`;
    const candidatePath = path.join(sessionsRoot, base);
    if (!fs.existsSync(candidatePath)) {
        return base;
    }
    return `${base}-${crypto.randomBytes(2).toString('hex')}`;
}
function printSummary(params) {
    printMinimalPanel(params.solenyaMode ? 'SOLENYA ACTIVATED!' : 'Pickle Rick Activated!', {
        Iteration: params.currentIteration,
        Limit: params.loopLimit > 0 ? params.loopLimit : '∞',
        'Max Time': `${params.timeLimit}m`,
        'Worker TO': `${params.workerTimeout}s`,
        Promise: params.promiseToken || 'None',
        Extension: params.extensionRoot,
        Path: params.sessionPath,
        Solenya: params.solenyaMode ? 'ON' : 'OFF',
    }, params.solenyaMode ? 'RED' : 'GREEN', params.solenyaMode ? '🔪' : '🥒');
    if (params.promiseToken) {
        console.log(`
${Style.YELLOW}⚠️  STRICT EXIT CONDITION ACTIVE${Style.RESET}`);
        console.log(`   You must output: <promise>${params.promiseToken}</promise>\n`);
    }
}
async function main() {
    const extensionRoot = getExtensionRoot();
    const sessionsRoot = path.join(extensionRoot, 'sessions');
    ensureCoreDirs(extensionRoot);
    const defaults = loadDefaults(extensionRoot);
    const args = parseSetupArgs(process.argv.slice(2));
    const startEpoch = Math.floor(Date.now() / 1000);
    let sessionPath;
    let state;
    if (args.resume) {
        const mappedSession = args.resumePath ||
            resolveSessionPath(extensionRoot, process.cwd()) ||
            findLatestSessionForCwd(extensionRoot, process.cwd());
        if (!mappedSession) {
            die('No active session found for current directory. Provide --resume <PATH> to continue.');
        }
        const statePath = path.join(mappedSession, 'state.json');
        const loaded = readStateFile(statePath);
        if (!loaded) {
            die(`Unable to read state file at ${statePath}`);
        }
        state = loaded;
        sessionPath = state.session_dir || mappedSession;
        state.active = !args.paused;
        if (args.reset) {
            state.iteration = 0;
            state.start_time_epoch = startEpoch;
        }
        if (args.provided.maxIterations && args.maxIterations != null) {
            state.max_iterations = args.maxIterations;
        }
        if (args.provided.maxTime && args.maxTime != null) {
            state.max_time_minutes = args.maxTime;
        }
        if (args.provided.workerTimeout && args.workerTimeout != null) {
            state.worker_timeout_seconds = args.workerTimeout;
        }
        if (args.provided.completionPromise) {
            state.completion_promise = args.completionPromise ?? null;
        }
        writeStateFile(statePath, state);
    }
    else {
        const task = args.taskParts.join(' ').trim();
        if (!task) {
            die('No task specified. Run /pickle --help for usage.');
        }
        const maxIterations = args.provided.maxIterations
            ? (args.maxIterations ?? defaults.loopLimit)
            : defaults.loopLimit;
        const maxTime = args.provided.maxTime ? (args.maxTime ?? defaults.timeLimit) : defaults.timeLimit;
        const workerTimeout = args.provided.workerTimeout
            ? (args.workerTimeout ?? defaults.workerTimeout)
            : defaults.workerTimeout;
        const sessionId = createSessionId(sessionsRoot, args.name);
        sessionPath = path.join(sessionsRoot, sessionId);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        state = {
            active: !args.paused,
            working_dir: process.cwd(),
            step: 'prd',
            iteration: 0,
            max_iterations: maxIterations,
            max_time_minutes: maxTime,
            worker_timeout_seconds: workerTimeout,
            start_time_epoch: startEpoch,
            completion_promise: args.provided.completionPromise ? (args.completionPromise ?? null) : null,
            original_prompt: task,
            current_ticket: null,
            history: [],
            started_at: new Date().toISOString(),
            session_dir: sessionPath,
        };
        writeStateFile(path.join(sessionPath, 'state.json'), state);
    }
    setSessionForCwd(extensionRoot, process.cwd(), sessionPath, state.working_dir);
    printSummary({
        extensionRoot,
        sessionPath,
        currentIteration: state.iteration + 1,
        loopLimit: state.max_iterations,
        timeLimit: state.max_time_minutes,
        workerTimeout: state.worker_timeout_seconds,
        promiseToken: state.completion_promise,
    });
}
if (process.argv[1] && path.basename(process.argv[1]).startsWith('setup')) {
    main().catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        die(message);
    });
}

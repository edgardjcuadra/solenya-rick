#!/usr/bin/env node
import * as path from 'path';
import { getExtensionRoot } from '../services/pickle-utils.js';
import { resolveSessionPath } from '../services/session-state.js';
export function getSessionPath(cwd) {
    return resolveSessionPath(getExtensionRoot(), cwd);
}
if (process.argv[1] && path.basename(process.argv[1]).startsWith('get-session')) {
    const sessionPath = getSessionPath(process.cwd());
    if (sessionPath) {
        process.stdout.write(sessionPath);
    }
    else {
        process.exit(1);
    }
}

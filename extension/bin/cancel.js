#!/usr/bin/env node
import * as path from 'path';
import { getExtensionRoot, printMinimalPanel, Style } from '../services/pickle-utils.js';
import { isSamePathOrDescendant, readStateFile, resolveSessionPath, writeStateFile, } from '../services/session-state.js';
export function cancelSession(cwd) {
    const sessionPath = resolveSessionPath(getExtensionRoot(), cwd);
    if (!sessionPath) {
        console.log('No active session found for this directory.');
        return;
    }
    const statePath = path.join(sessionPath, 'state.json');
    const state = readStateFile(statePath);
    if (!state) {
        console.log('State file not found.');
        return;
    }
    if (!isSamePathOrDescendant(cwd, state.working_dir)) {
        console.error(`${Style.RED}❌ Wrong directory. Active session is in ${state.working_dir}.${Style.RESET}`);
        return;
    }
    if (!state.active) {
        printMinimalPanel('Loop Already Inactive', {
            Session: path.basename(sessionPath),
            Status: 'Inactive',
        }, 'YELLOW', '🛑');
        return;
    }
    state.active = false;
    writeStateFile(statePath, state);
    printMinimalPanel('Loop Cancelled', {
        Session: path.basename(sessionPath),
        Status: 'Inactive',
    }, 'RED', '🛑');
}
if (process.argv[1] && path.basename(process.argv[1]).startsWith('cancel')) {
    cancelSession(process.cwd());
}

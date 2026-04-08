#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { printMinimalPanel, getExtensionRoot } from '../services/pickle-utils.js';
import { resolveSessionPath } from '../services/session-state.js';
function main() {
    const args = process.argv.slice(2);
    let sessionPath = '';
    // Find session path from args or map
    const resumeIndex = args.indexOf('--resume');
    if (resumeIndex !== -1 && args[resumeIndex + 1]) {
        sessionPath = args[resumeIndex + 1];
    }
    if (!sessionPath || !fs.existsSync(sessionPath)) {
        sessionPath = resolveSessionPath(getExtensionRoot(), process.cwd()) || '';
    }
    if (!sessionPath || !fs.existsSync(sessionPath)) {
        console.error('Worker Error: No session path found.');
        process.exit(1);
    }
    printMinimalPanel('Morty Worker Initialized', {
        Session: path.basename(sessionPath),
        CWD: process.cwd(),
    }, 'BLUE', '👶');
}
main();

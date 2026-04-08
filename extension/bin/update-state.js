#!/usr/bin/env node
import * as path from 'path';
import { readStateFile, writeStateFile } from '../services/session-state.js';
const STEP_VALUES = [
    'prd',
    'breakdown',
    'research',
    'plan',
    'implement',
    'refactor',
    'done',
];
const NUMERIC_KEYS = new Set([
    'iteration',
    'max_iterations',
    'max_time_minutes',
    'worker_timeout_seconds',
    'start_time_epoch',
]);
const BOOLEAN_KEYS = new Set(['active', 'jar_complete', 'worker']);
const NULLABLE_KEYS = new Set(['completion_promise', 'current_ticket']);
const STRING_KEYS = new Set(['step', 'working_dir', 'original_prompt']);
function parseStateValue(key, rawValue) {
    if (NULLABLE_KEYS.has(key) && rawValue === 'null') {
        return null;
    }
    if (BOOLEAN_KEYS.has(key)) {
        if (rawValue === 'true')
            return true;
        if (rawValue === 'false')
            return false;
        throw new Error(`Expected boolean value for ${key}. Use true or false.`);
    }
    if (NUMERIC_KEYS.has(key)) {
        const parsed = Number.parseInt(rawValue, 10);
        if (!Number.isFinite(parsed)) {
            throw new Error(`Expected numeric value for ${key}. Received: ${rawValue}`);
        }
        return parsed;
    }
    if (key === 'step') {
        if (!STEP_VALUES.includes(rawValue)) {
            throw new Error(`Invalid step "${rawValue}". Allowed values: ${STEP_VALUES.join(', ')}`);
        }
        return rawValue;
    }
    if (STRING_KEYS.has(key) || NULLABLE_KEYS.has(key)) {
        return rawValue;
    }
    throw new Error(`Unsupported key "${key}". Allowed keys: ${[
        ...NUMERIC_KEYS,
        ...BOOLEAN_KEYS,
        ...NULLABLE_KEYS,
        ...STRING_KEYS,
    ].join(', ')}`);
}
/**
 * Usage: node update-state.js <key> <value> <session_dir>
 */
export function updateState(key, rawValue, sessionDir) {
    const statePath = path.join(sessionDir, 'state.json');
    const state = readStateFile(statePath);
    if (!state) {
        throw new Error(`state.json not found at ${statePath}`);
    }
    const value = parseStateValue(key, rawValue);
    const nextState = {
        ...state,
        [key]: value,
    };
    writeStateFile(statePath, nextState);
    console.log(`Successfully updated ${key} to ${String(value)} in ${statePath}`);
}
if (process.argv[1] && path.basename(process.argv[1]).startsWith('update-state')) {
    const [key, value, sessionDir] = process.argv.slice(2);
    if (!key || value == null || !sessionDir) {
        console.error('Usage: node update-state.js <key> <value> <session_dir>');
        process.exit(1);
    }
    try {
        updateState(key, value, sessionDir);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to update state: ${message}`);
        process.exit(1);
    }
}
export { parseStateValue };

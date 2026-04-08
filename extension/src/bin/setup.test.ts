import { describe, expect, it } from 'vitest';

import { parseSetupArgs } from './setup.js';

describe('setup argument parser', () => {
  it('parses loop config flags and task', () => {
    const parsed = parseSetupArgs([
      '--max-iterations',
      '8',
      '--max-time',
      '45',
      '--worker-timeout',
      '900',
      '--completion-promise',
      'DONE',
      '--name',
      'feature-auth',
      'Implement',
      'feature',
    ]);

    expect(parsed.maxIterations).toBe(8);
    expect(parsed.maxTime).toBe(45);
    expect(parsed.workerTimeout).toBe(900);
    expect(parsed.completionPromise).toBe('DONE');
    expect(parsed.name).toBe('feature-auth');
    expect(parsed.taskParts.join(' ')).toBe('Implement feature');
  });

  it('parses resume mode with optional path', () => {
    const parsed = parseSetupArgs(['--resume', '/tmp/session', '--reset', '--paused']);

    expect(parsed.resume).toBe(true);
    expect(parsed.resumePath).toContain('/tmp/session');
    expect(parsed.reset).toBe(true);
    expect(parsed.paused).toBe(true);
  });

  it('throws for invalid numeric values', () => {
    expect(() => parseSetupArgs(['--max-time', 'abc'])).toThrow('Invalid value for --max-time');
  });
});

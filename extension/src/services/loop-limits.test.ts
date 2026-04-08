import { describe, expect, it } from 'vitest';

import { evaluateLoopLimits } from './loop-limits.js';

const baseState = {
  active: true,
  working_dir: '/repo',
  step: 'implement',
  iteration: 0,
  max_iterations: 3,
  max_time_minutes: 60,
  worker_timeout_seconds: 1200,
  start_time_epoch: 1000,
  completion_promise: null,
  original_prompt: 'task',
  current_ticket: null,
  history: [],
  started_at: '2026-01-01T00:00:00Z',
  session_dir: '/sessions/abc',
};

describe('evaluateLoopLimits', () => {
  it('does not exceed when under limits', () => {
    const result = evaluateLoopLimits({ ...baseState, iteration: 2 }, 1200);
    expect(result.exceeded).toBe(false);
  });

  it('exceeds when iteration is above max', () => {
    const result = evaluateLoopLimits({ ...baseState, iteration: 4 }, 1200);
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('iteration-limit');
  });

  it('exceeds when time limit reached', () => {
    const result = evaluateLoopLimits({ ...baseState, max_time_minutes: 1 }, 1060);
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('time-limit');
  });

  it('exceeds when jar_complete is true', () => {
    const result = evaluateLoopLimits({ ...baseState, jar_complete: true }, 1200);
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('jar-complete');
  });
});

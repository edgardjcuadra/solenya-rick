import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseStateValue, updateState } from './update-state.js';

vi.mock('../services/session-state.js', () => ({
  readStateFile: vi.fn(),
  writeStateFile: vi.fn(),
}));

import { readStateFile, writeStateFile } from '../services/session-state.js';

describe('update-state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('updates step with validated enum value', () => {
    vi.mocked(readStateFile).mockReturnValue({
      active: true,
      working_dir: '/repo',
      step: 'prd',
      iteration: 0,
      max_iterations: 10,
      max_time_minutes: 60,
      worker_timeout_seconds: 1200,
      start_time_epoch: 1,
      completion_promise: null,
      original_prompt: 'hello',
      current_ticket: null,
      history: [],
      started_at: '2026-01-01T00:00:00Z',
      session_dir: '/sessions/abc',
    });

    updateState('step', 'breakdown', '/sessions/abc');

    expect(writeStateFile).toHaveBeenCalledOnce();
    const [, state] = vi.mocked(writeStateFile).mock.calls[0];
    expect((state as { step: string }).step).toBe('breakdown');
  });

  it('throws on unsupported keys', () => {
    expect(() => parseStateValue('not_a_key', 'value')).toThrow('Unsupported key');
  });

  it('parses nullable values', () => {
    expect(parseStateValue('completion_promise', 'null')).toBeNull();
    expect(parseStateValue('current_ticket', 'foo')).toBe('foo');
  });

  it('validates numeric and boolean fields', () => {
    expect(parseStateValue('iteration', '42')).toBe(42);
    expect(parseStateValue('active', 'true')).toBe(true);
    expect(() => parseStateValue('active', 'yes')).toThrow('Expected boolean');
  });
});

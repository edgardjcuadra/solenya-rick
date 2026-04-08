import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cancelSession } from './cancel.js';

vi.mock('../services/pickle-utils.js', () => ({
  getExtensionRoot: vi.fn(() => '/ext'),
  printMinimalPanel: vi.fn(),
  Style: { RED: '', RESET: '' },
}));

vi.mock('../services/session-state.js', () => ({
  resolveSessionPath: vi.fn(),
  readStateFile: vi.fn(),
  writeStateFile: vi.fn(),
  isSamePathOrDescendant: vi.fn(),
}));

import {
  isSamePathOrDescendant,
  readStateFile,
  resolveSessionPath,
  writeStateFile,
} from '../services/session-state.js';

describe('cancel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sets active=false when session exists and cwd is valid', () => {
    vi.mocked(resolveSessionPath).mockReturnValue('/sessions/abc');
    vi.mocked(readStateFile).mockReturnValue({
      active: true,
      working_dir: '/repo',
      step: 'implement',
      iteration: 2,
      max_iterations: 5,
      max_time_minutes: 60,
      worker_timeout_seconds: 1200,
      start_time_epoch: 1,
      completion_promise: 'I AM DONE',
      original_prompt: 'do thing',
      current_ticket: null,
      history: [],
      started_at: '2026-01-01T00:00:00Z',
      session_dir: '/sessions/abc',
    });
    vi.mocked(isSamePathOrDescendant).mockReturnValue(true);

    cancelSession('/repo/subdir');

    expect(writeStateFile).toHaveBeenCalledTimes(1);
    const [, updatedState] = vi.mocked(writeStateFile).mock.calls[0];
    expect((updatedState as { active: boolean }).active).toBe(false);
  });

  it('does not write state when cwd is outside session working_dir', () => {
    vi.mocked(resolveSessionPath).mockReturnValue('/sessions/abc');
    vi.mocked(readStateFile).mockReturnValue({
      active: true,
      working_dir: '/repo',
      step: 'implement',
      iteration: 2,
      max_iterations: 5,
      max_time_minutes: 60,
      worker_timeout_seconds: 1200,
      start_time_epoch: 1,
      completion_promise: null,
      original_prompt: 'do thing',
      current_ticket: null,
      history: [],
      started_at: '2026-01-01T00:00:00Z',
      session_dir: '/sessions/abc',
    });
    vi.mocked(isSamePathOrDescendant).mockReturnValue(false);

    cancelSession('/another/repo');

    expect(writeStateFile).not.toHaveBeenCalled();
  });
});

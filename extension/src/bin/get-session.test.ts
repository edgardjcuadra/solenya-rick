import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionPath } from './get-session.js';

vi.mock('../services/pickle-utils.js', () => ({
  getExtensionRoot: vi.fn(() => '/test-root'),
}));

vi.mock('../services/session-state.js', () => ({
  resolveSessionPath: vi.fn(),
}));

import { resolveSessionPath } from '../services/session-state.js';

describe('get-session', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the resolved session path for the cwd', () => {
    vi.mocked(resolveSessionPath).mockReturnValue('/sessions/2026-02-23-abc123');

    const result = getSessionPath('/repo/nested/path');
    expect(result).toBe('/sessions/2026-02-23-abc123');
    expect(resolveSessionPath).toHaveBeenCalledWith('/test-root', '/repo/nested/path');
  });

  it('returns null when no session exists for cwd hierarchy', () => {
    vi.mocked(resolveSessionPath).mockReturnValue(null);

    const result = getSessionPath('/repo/unknown');
    expect(result).toBeNull();
  });
});

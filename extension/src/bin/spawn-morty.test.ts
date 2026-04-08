import { describe, expect, it } from 'vitest';

import { parseSpawnMortyArgs } from './spawn-morty.js';

describe('spawn-morty argument parser', () => {
  it('parses task and required ticket args', () => {
    const parsed = parseSpawnMortyArgs([
      '--ticket-id',
      'AUTH-1',
      '--ticket-path',
      '/tmp/ticket',
      '--timeout',
      '90',
      '--output-format',
      'stream-json',
      '--model',
      'gemini-2.5-pro',
      'Implement',
      'auth',
      'flow',
    ]);

    expect(parsed.ticketId).toBe('AUTH-1');
    expect(parsed.ticketPath).toBe('/tmp/ticket');
    expect(parsed.timeoutSeconds).toBe(90);
    expect(parsed.outputFormat).toBe('stream-json');
    expect(parsed.model).toBe('gemini-2.5-pro');
    expect(parsed.task).toBe('Implement auth flow');
  });

  it('throws when required args are missing', () => {
    expect(() => parseSpawnMortyArgs(['--ticket-id', 'AUTH-1', 'task'])).toThrow(
      '--ticket-id and --ticket-path are required'
    );
  });

  it('throws on unknown flags', () => {
    expect(() =>
      parseSpawnMortyArgs(['--ticket-id', 'AUTH-1', '--ticket-path', '/tmp/t', '--foo', 'bar', 'task'])
    ).toThrow('Unknown option');
  });
});

import { describe, expect, it } from 'vitest';
import { isSupportedCommand, normalizeCommand } from '../src/application/commandRouter.js';

describe('command router', () => {
  it('normalizes shell commands', () => {
    expect(normalizeCommand('   .sh   Scan  ')).toBe('.sh scan');
  });

  it('supports mvp shell commands', () => {
    expect(isSupportedCommand('.sh status')).toBe(true);
    expect(isSupportedCommand('.sh market')).toBe(false);
  });
});

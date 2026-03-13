import { describe, expect, it } from 'vitest';
import { isSupportedCommand, normalizeCommand } from '../src/application/commandRouter.js';

describe('command router', () => {
  it('normalizes shell commands', () => {
    expect(normalizeCommand('   .sh   Scan  ')).toBe('.sh scan');
  });

  it('supports mvp shell commands', () => {
    expect(isSupportedCommand('.sh start')).toBe(true);
    expect(isSupportedCommand('.sh help')).toBe(true);
    expect(isSupportedCommand('.sh status')).toBe(true);
    expect(isSupportedCommand('.sh profile')).toBe(true);
    expect(isSupportedCommand('.sh collection')).toBe(true);
    expect(isSupportedCommand('.sh leaderboard')).toBe(true);
    expect(isSupportedCommand('.sh factions')).toBe(true);
    expect(isSupportedCommand('.sh factions shop')).toBe(true);
    expect(isSupportedCommand('.sh resume')).toBe(true);
    expect(isSupportedCommand('.sh tasks')).toBe(true);
    expect(isSupportedCommand('.sh tasks claim')).toBe(true);
    expect(isSupportedCommand('.sh scan')).toBe(true);
    expect(isSupportedCommand('.sh connect')).toBe(true);
    expect(isSupportedCommand('.sh claim')).toBe(true);
    expect(isSupportedCommand('.sh upgrade')).toBe(true);
    expect(isSupportedCommand('.sh upgrade modem')).toBe(true);
    expect(isSupportedCommand('.sh   upgrade   storage')).toBe(true);
    expect(isSupportedCommand('.sh upgrade cpu')).toBe(true);
    expect(isSupportedCommand('.sh tasks claim now')).toBe(false);
    expect(isSupportedCommand('.sh scan now')).toBe(false);
    expect(isSupportedCommand('.sh upgrade ram')).toBe(false);
    expect(isSupportedCommand('.sh market')).toBe(false);
  });
});

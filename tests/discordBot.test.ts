import { describe, expect, it } from 'vitest';
import { parseStartCommand, parseUpgradePath } from '../src/transport/discord/discordBot.js';

describe('parseStartCommand', () => {
  it('uses defaults when args are missing', () => {
    const parsed = parseStartCommand('.sh start', 'SysOp');

    expect(parsed).toEqual({
      handle: 'sysop',
      nodeName: 'sysop-node',
      archetype: 'RELAY_NODE',
    });
  });

  it('reads explicit args', () => {
    const parsed = parseStartCommand('.sh start neon relay market', 'SysOp');

    expect(parsed).toEqual({
      handle: 'neon',
      nodeName: 'relay',
      archetype: 'MARKET_NODE',
    });
  });
});

describe('parseUpgradePath', () => {
  it('returns null for missing path', () => {
    expect(parseUpgradePath('.sh upgrade')).toBeNull();
  });

  it('maps known paths', () => {
    expect(parseUpgradePath('.sh upgrade modem')).toBe('MODEM');
    expect(parseUpgradePath('.sh upgrade storage')).toBe('STORAGE');
    expect(parseUpgradePath('.sh upgrade cpu')).toBe('CPU');
  });
});

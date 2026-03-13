import { describe, expect, it } from 'vitest';
import { formatProfileResponse, parseStartCommand, parseUpgradePath } from '../src/transport/discord/discordBot.js';

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

describe('formatProfileResponse', () => {
  it('includes collectible totals and rare counts', () => {
    const message = formatProfileResponse('neo', 'DIAL_UP', 42, 'matrix', 'RELAY_NODE', 6, 2, 1, 3, 1);

    expect(message).toContain('Handle: **neo** | Era: **DIAL_UP** | Rep: **42**');
    expect(message).toContain('Node: **matrix** (RELAY_NODE)');
    expect(message).toContain('Collectibles: **6** total | **2** rare+ | **1** epic');
    expect(message).toContain('Sets: **1** complete | Categories unlocked: **3/3**');
  });
});

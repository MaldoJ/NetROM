import { describe, expect, it } from 'vitest';
import { formatCollectionResponse, formatProfileResponse, formatTaskSnapshot, parseStartCommand, parseUpgradePath } from '../src/transport/discord/discordBot.js';
import type { TaskDefinition } from '../src/domain/entities.js';

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


describe('formatCollectionResponse', () => {
  it('shows an empty-state message when no collectibles exist', () => {
    const message = formatCollectionResponse(0, 0, []);

    expect(message).toContain('Collection vault');
    expect(message).toContain('Total collectibles: **0**');
    expect(message).toContain('Complete sets forged: **0**');
    expect(message).toContain('Recent drops: none yet.');
  });

  it('lists recent collectibles with rarity and category', () => {
    const message = formatCollectionResponse(7, 2, [
      { name: 'Relic_SIGIL_RARE', rarity: 'RARE', category: 'ANSI_RELIC' },
      { name: 'Log_PULSE_EPIC', rarity: 'EPIC', category: 'ARCHIVED_LOG' },
    ]);

    expect(message).toContain('Total collectibles: **7**');
    expect(message).toContain('Complete sets forged: **2**');
    expect(message).toContain('**Relic_SIGIL_RARE** [RARE] (ANSI_RELIC)');
    expect(message).toContain('**Log_PULSE_EPIC** [EPIC] (ARCHIVED_LOG)');
  });
});

describe('formatTaskSnapshot', () => {
  const task: TaskDefinition = {
    id: 'daily_1',
    scope: 'DAILY',
    key: 'RUN_SCANS',
    objectiveValue: 3,
    reward: { credits: 40, parts: 4, reputation: 15 },
    activeFrom: new Date('2026-01-01T00:00:00Z'),
    activeTo: new Date('2026-01-01T23:59:59Z'),
  };

  it('shows in-progress state with remaining count', () => {
    const line = formatTaskSnapshot(task, 1, null);

    expect(line).toContain('🕓 [DAILY] RUN_SCANS 1/3 (2 left)');
    expect(line).toContain('Reward 40 credits, 4 parts, 15 rep');
  });

  it('shows completed state when completedAt is set', () => {
    const line = formatTaskSnapshot(task, 3, new Date('2026-01-01T12:00:00Z'));

    expect(line).toContain('✅ [DAILY] RUN_SCANS 3/3 (0 left)');
  });
});

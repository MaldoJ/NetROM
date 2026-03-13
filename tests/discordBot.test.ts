import { describe, expect, it } from 'vitest';
import { formatCollectionResponse, formatFactionResponse, formatFactionShopResponse, formatProfileResponse, formatTaskSnapshot, parseStartCommand, parseUpgradePath } from '../src/transport/discord/discordBot.js';
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

  it('handles extra whitespace between args', () => {
    const parsed = parseStartCommand('.sh   start   neon   relay   market', 'SysOp');

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
    expect(parseUpgradePath('.sh upgrade MODEM')).toBe('MODEM');
    expect(parseUpgradePath('.sh   upgrade   storage')).toBe('STORAGE');
  });
});

describe('formatProfileResponse', () => {
  it('includes collectible totals and rare counts', () => {
    const message = formatProfileResponse('neo', 'DIAL_UP', 42, 'matrix', 'RELAY_NODE', 6, 2, 1, 2, 1, 3, 1);

    expect(message).toContain('Handle: **neo** | Era: **DIAL_UP** | Rep: **42**');
    expect(message).toContain('Node: **matrix** (RELAY_NODE)');
    expect(message).toContain('Collectibles: **6** total | **3** rare+ | **1** epic');
    expect(message).toContain('Rarity spread: C **2** | U **1** | R **2** | E **1**');
    expect(message).toContain('Sets: **1** complete | Categories unlocked: **3/3**');
    expect(message).toContain('Forge rank: **INITIATE FORGE** | Prestige score: **19**');
  });
});


describe('formatCollectionResponse', () => {
  it('shows an empty-state message when no collectibles exist', () => {
    const message = formatCollectionResponse(0, 0, 0, 0, 0, 0, []);

    expect(message).toContain('Collection vault');
    expect(message).toContain('Total collectibles: **0**');
    expect(message).toContain('Complete sets forged: **0**');
    expect(message).toContain('Category totals: ANSI **0** | ARCHIVE **0** | MALWARE **0**');
    expect(message).toContain('Set forge progress: **0/3** fragments toward set #1 | Missing pieces: **3**');
    expect(message).toContain('Category unlocks: **0/3**');
    expect(message).toContain('Forge rank: **UNSEEDED**');
    expect(message).toContain('Recent drops: none yet.');
  });

  it('lists recent collectibles with rarity and category', () => {
    const message = formatCollectionResponse(7, 2, 3, 2, 2, 3, [
      { name: 'Relic_SIGIL_RARE', rarity: 'RARE', category: 'ANSI_RELIC' },
      { name: 'Log_PULSE_EPIC', rarity: 'EPIC', category: 'ARCHIVED_LOG' },
    ]);

    expect(message).toContain('Total collectibles: **7**');
    expect(message).toContain('Complete sets forged: **2**');
    expect(message).toContain('Category totals: ANSI **3** | ARCHIVE **2** | MALWARE **2**');
    expect(message).toContain('Set forge progress: **1/3** fragments toward set #3 | Missing pieces: **2**');
    expect(message).toContain('Category unlocks: **3/3**');
    expect(message).toContain('Forge rank: **INITIATE FORGE**');
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
    const line = formatTaskSnapshot(task, 1, null, null);

    expect(line).toContain('🕓 [DAILY] Run scans 1/3 (33%) (2 left, ');
    expect(line).toContain('Run scans payout: 40 credits, 4 parts, 15 rep');
  });

  it('shows completed state when completedAt is set', () => {
    const line = formatTaskSnapshot(task, 3, new Date('2026-01-01T12:00:00Z'), null);

    expect(line).toContain('✅ [DAILY] Run scans 3/3 (100%) (0 left, ');
  });

  it('shows payout claimed state when reward was already claimed', () => {
    const line = formatTaskSnapshot(task, 3, new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:30:00Z'));

    expect(line).toContain('🟣 [DAILY] Run scans 3/3 (100%) (0 left, ');
    expect(line).toContain('payout claimed');
  });
});


describe('formatFactionResponse', () => {
  it('shows empty state when no factions are initialized', () => {
    const message = formatFactionResponse([]);

    expect(message).toContain('No faction standing found yet');
  });

  it('renders faction standings sorted payload', () => {
    const message = formatFactionResponse([
      { faction: 'HELIX_SYNDICATE', reputation: 22, rank: 2 },
      { faction: 'NULL_SECTOR', reputation: 10, rank: 1 },
    ]);

    expect(message).toContain('Faction standings');
    expect(message).toContain('**Helix Syndicate** | Rep 22 | Rank 2 | Next rank in 78 rep');
    expect(message).toContain('**Null Sector** | Rep 10 | Rank 1 | Next rank in 90 rep');
  });
});


describe('formatFactionShopResponse', () => {
  it('shows locked preview state when no factions are initialized', () => {
    const message = formatFactionShopResponse([]);

    expect(message).toContain('No faction standing found yet');
  });

  it('renders rank-gated access by faction standing', () => {
    const message = formatFactionShopResponse([
      { faction: 'NULL_SECTOR', reputation: 15, rank: 1 },
      { faction: 'HELIX_SYNDICATE', reputation: 45, rank: 2 },
    ]);

    expect(message).toContain('Faction shop preview');
    expect(message).toContain('**Helix Syndicate** | Rank 2 | Access UNLOCKED');
    expect(message).toContain('**Null Sector** | Rank 1 | Access LOCKED');
  });
});

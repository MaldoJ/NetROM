import { describe, expect, it } from 'vitest';
import { formatCollectionResponse, formatFactionContractsResponse, formatFactionResponse, formatFactionShopResponse, formatFactionTasksResponse, formatProfileResponse, formatTaskSnapshot, parseStartCommand, parseUpgradePath } from '../src/transport/discord/discordBot.js';
import { GameEngine } from '../src/application/gameEngine.js';
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
      { faction: 'NULL_SECTOR', reputation: 10, rank: 1 },
      { faction: 'HELIX_SYNDICATE', reputation: 22, rank: 2 },
    ]);

    expect(message).toContain('Faction standings');
    expect(message).toContain('**Helix Syndicate** | Rep 22 | Rank 2 | Next rank in 78 rep');
    expect(message).toContain('**Null Sector** | Rep 10 | Rank 1 | Next rank in 90 rep');
    expect(message.indexOf('**Helix Syndicate**')).toBeLessThan(message.indexOf('**Null Sector**'));
  });


  it('uses faction name tie-breaker when reputation is equal', () => {
    const message = formatFactionResponse([
      { faction: 'NULL_SECTOR', reputation: 50, rank: 1 },
      { faction: 'HELIX_SYNDICATE', reputation: 50, rank: 1 },
    ]);

    expect(message.indexOf('**Helix Syndicate**')).toBeLessThan(message.indexOf('**Null Sector**'));
  });

  it('shows max-rank copy when faction rank cap is reached', () => {
    const message = formatFactionResponse([{ faction: 'HELIX_SYNDICATE', reputation: 350, rank: 3 }]);

    expect(message).toContain('**Helix Syndicate** | Rep 350 | Rank 3 | Next rank: MAX');
  });
});


describe('formatFactionShopResponse', () => {
  it('shows locked preview state when no factions are initialized', () => {
    const message = formatFactionShopResponse([], new GameEngine());

    expect(message).toContain('No faction standing found yet');
  });

  it('renders rank-gated access by faction standing', () => {
    const message = formatFactionShopResponse([
      { faction: 'NULL_SECTOR', reputation: 15, rank: 1 },
      { faction: 'HELIX_SYNDICATE', reputation: 145, rank: 2 },
    ], new GameEngine());

    expect(message).toContain('Faction shop inventory');
    expect(message).toContain('**Helix Syndicate** | Rank 2 | Available stock: 2');
    expect(message).toContain('Helix Modem Amplifier II (R2)');
    expect(message).toContain('Next stock unlock: Rank 3 — Helix Security Kernel');
    expect(message).toContain('**Null Sector** | Rank 1 | Available stock: 1');
  });


  it('applies deterministic tie-break ordering for equal reputation', () => {
    const message = formatFactionShopResponse([
      { faction: 'NULL_SECTOR', reputation: 90, rank: 2 },
      { faction: 'HELIX_SYNDICATE', reputation: 90, rank: 2 },
    ], new GameEngine());

    expect(message.indexOf('**Helix Syndicate**')).toBeLessThan(message.indexOf('**Null Sector**'));
  });

  it('shows max unlock copy when all shop items are available', () => {
    const message = formatFactionShopResponse([
      { faction: 'HELIX_SYNDICATE', reputation: 320, rank: 3 },
    ], new GameEngine());

    expect(message).toContain('**Helix Syndicate** | Rank 3 | Available stock: 3');
    expect(message).toContain('Next stock unlock: MAX');
  });
});


describe('formatFactionContractsResponse', () => {
  it('shows locked board state when no factions are initialized', () => {
    const message = formatFactionContractsResponse([], 'DIAL_UP', new GameEngine());

    expect(message).toContain('No faction standing found yet');
  });

  it('renders available contract tier by rank', () => {
    const message = formatFactionContractsResponse(
      [
        { faction: 'NULL_SECTOR', reputation: 15, rank: 1 },
        { faction: 'HELIX_SYNDICATE', reputation: 220, rank: 3 },
        { faction: 'LATTICE_COLLECTIVE', reputation: 145, rank: 2 },
      ],
      'EARLY_INTERNET',
      new GameEngine(),
    );

    expect(message).toContain('Faction contract board');
    expect(message).toContain('**Helix Syndicate** | Available Tier III contracts | Next unlock: MAX');
    expect(message).toContain('**Lattice Collective** | Available Tier II contracts | Next unlock: Rank 3');
    expect(message).toContain('**Null Sector** | Available Tier I contracts | Next unlock: Rank 2');
  });


  it('applies deterministic tie-break ordering for equal reputation', () => {
    const message = formatFactionContractsResponse(
      [
        { faction: 'NULL_SECTOR', reputation: 120, rank: 2 },
        { faction: 'HELIX_SYNDICATE', reputation: 120, rank: 2 },
      ],
      'EARLY_INTERNET',
      new GameEngine(),
    );

    expect(message.indexOf('**Helix Syndicate**')).toBeLessThan(message.indexOf('**Null Sector**'));
  });

  it('applies era gating to contract tier availability', () => {
    const message = formatFactionContractsResponse(
      [{ faction: 'HELIX_SYNDICATE', reputation: 320, rank: 4 }],
      'BULLETIN_RELAY',
      new GameEngine(),
    );

    expect(message).toContain('Available Tier II contracts');
    expect(message).toContain('Era gate: BULLETIN_RELAY max Tier II');
  });

  it('shows max unlock copy when rank cap and era allow top contract tier', () => {
    const message = formatFactionContractsResponse(
      [{ faction: 'HELIX_SYNDICATE', reputation: 420, rank: 4 }],
      'MODERN_GRID',
      new GameEngine(),
    );

    expect(message).toContain('Available Tier III contracts');
    expect(message).toContain('Next unlock: MAX');
  });
});


describe('formatFactionTasksResponse', () => {
  it('shows locked task board state when no factions are initialized', () => {
    const message = formatFactionTasksResponse([], new GameEngine());

    expect(message).toContain('No faction standing found yet');
  });

  it('renders available faction tasks and next unlock details', () => {
    const message = formatFactionTasksResponse(
      [
        { faction: 'HELIX_SYNDICATE', reputation: 140, rank: 2 },
        { faction: 'NULL_SECTOR', reputation: 40, rank: 1 },
      ],
      new GameEngine(),
    );

    expect(message).toContain('Faction task board');
    expect(message).toContain('**Helix Syndicate** | Rank 2 | Available tasks: 2');
    expect(message).toContain('Backbone Patch Relay (R2)');
    expect(message).toContain('Next unlock: Rank 3 — Core Overwatch Rotation');
    expect(message).toContain('**Null Sector** | Rank 1 | Available tasks: 1');
    expect(message).toContain('Next unlock: Rank 2 — Ghost Route Injection');
  });

  it('shows max unlock copy when all faction tasks are available', () => {
    const message = formatFactionTasksResponse(
      [{ faction: 'HELIX_SYNDICATE', reputation: 305, rank: 3 }],
      new GameEngine(),
    );

    expect(message).toContain('**Helix Syndicate** | Rank 3 | Available tasks: 3');
    expect(message).toContain('Next unlock: MAX');
  });

  it('applies deterministic tie-break ordering for equal reputation', () => {
    const message = formatFactionTasksResponse(
      [
        { faction: 'NULL_SECTOR', reputation: 120, rank: 2 },
        { faction: 'HELIX_SYNDICATE', reputation: 120, rank: 2 },
      ],
      new GameEngine(),
    );

    expect(message.indexOf('**Helix Syndicate**')).toBeLessThan(message.indexOf('**Null Sector**'));
  });
});

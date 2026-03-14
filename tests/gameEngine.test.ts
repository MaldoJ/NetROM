import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/application/gameEngine.js';
import { SequenceRandomSource } from '../src/application/random.js';

describe('GameEngine', () => {
  it('onboards a player with dial-up defaults', () => {
    const engine = new GameEngine();
    const { player, node } = engine.onboard('123', 'sysop', 'alpha-node', 'RELAY_NODE');

    expect(player.currentEra).toBe('DIAL_UP');
    expect(node.wallet.credits).toBe(100);
    expect(node.name).toBe('alpha-node');
  });

  it('applies upgrade cost and stat increase', () => {
    const engine = new GameEngine();
    const { node } = engine.onboard('123', 'sysop', 'alpha-node', 'RELAY_NODE');

    const upgraded = engine.upgrade(node, 'MODEM');
    expect(upgraded.bandwidth).toBe(node.bandwidth + 1);
    expect(upgraded.wallet.credits).toBe(50);
    expect(upgraded.wallet.parts).toBe(5);
  });

  it('uses injected random source for deterministic scan outcomes', () => {
    const engine = new GameEngine(new SequenceRandomSource([0.51, 0.8]));

    const scan = engine.scan('plr_123');
    expect(scan.discoveryType).toBe('ARCHIVE_CACHE');
    expect(scan.threatLevel).toBe(3);
  });


  it('resolves faction contracts with deterministic faction and threat-scaled rep', () => {
    const engine = new GameEngine(new SequenceRandomSource([0.4]));

    const reward = engine.resolveFactionContract(3);

    expect(reward.faction).toBe('NULL_SECTOR');
    expect(reward.reputationGain).toBe(20);
  });

  it('lists faction tasks split by available and locked rank bands', () => {
    const engine = new GameEngine();

    const rankOne = engine.listFactionTasks('HELIX_SYNDICATE', 1);
    expect(rankOne.available).toHaveLength(1);
    expect(rankOne.available[0]?.requiredRank).toBe(1);
    expect(rankOne.locked).toHaveLength(2);

    const rankThree = engine.listFactionTasks('HELIX_SYNDICATE', 3);
    expect(rankThree.available).toHaveLength(3);
    expect(rankThree.locked).toHaveLength(0);
  });


  it('lists faction shop items split by available and locked rank bands', () => {
    const engine = new GameEngine();

    const rankOne = engine.listFactionShopItems('NULL_SECTOR', 1);
    expect(rankOne.available).toHaveLength(1);
    expect(rankOne.available[0]?.requiredRank).toBe(1);
    expect(rankOne.locked).toHaveLength(2);

    const rankThree = engine.listFactionShopItems('NULL_SECTOR', 3);
    expect(rankThree.available).toHaveLength(3);
    expect(rankThree.locked).toHaveLength(0);
  });
  it('rollCollectible returns deterministic collectible when roll succeeds', () => {
    const engine = new GameEngine(new SequenceRandomSource([0.1, 0.0, 0.6, 0.4]));

    const collectible = engine.rollCollectible('plr_1');

    expect(collectible).not.toBeNull();
    expect(collectible?.playerId).toBe('plr_1');
    expect(collectible?.category).toBe('ANSI_RELIC');
    expect(collectible?.rarity).toBe('RARE');
  });

  it('rollCollectible returns null when roll misses', () => {
    const engine = new GameEngine(new SequenceRandomSource([0.9]));

    expect(engine.rollCollectible('plr_1')).toBeNull();
  });

  it('applies rarity effects from collectible drops', () => {
    const engine = new GameEngine();
    const { node } = engine.onboard('123', 'sysop', 'alpha-node', 'RELAY_NODE');

    const uncommon = engine.applyCollectibleRarityEffect(node, {
      id: 'col_1',
      playerId: 'plr_1',
      category: 'ANSI_RELIC',
      rarity: 'UNCOMMON',
      name: 'uncommon ansi relic',
      acquiredAt: new Date('2026-03-10T00:00:00.000Z'),
    });
    expect(uncommon.node.wallet.data).toBe(node.wallet.data + 10);
    expect(uncommon.bonusSummary).toBe('+10 data');

    const rare = engine.applyCollectibleRarityEffect(node, {
      id: 'col_2',
      playerId: 'plr_1',
      category: 'ARCHIVED_LOG',
      rarity: 'RARE',
      name: 'rare archived log',
      acquiredAt: new Date('2026-03-10T00:00:00.000Z'),
    });
    expect(rare.node.wallet.credits).toBe(node.wallet.credits + 15);
    expect(rare.node.wallet.parts).toBe(node.wallet.parts + 2);
    expect(rare.bonusSummary).toBe('+15 credits, +2 parts');

    const epic = engine.applyCollectibleRarityEffect(node, {
      id: 'col_3',
      playerId: 'plr_1',
      category: 'MALWARE_SPECIMEN',
      rarity: 'EPIC',
      name: 'epic malware specimen',
      acquiredAt: new Date('2026-03-10T00:00:00.000Z'),
    });
    expect(epic.node.wallet.credits).toBe(node.wallet.credits + 30);
    expect(epic.node.wallet.parts).toBe(node.wallet.parts + 4);
    expect(epic.node.wallet.cycles).toBe(node.wallet.cycles + 1);
    expect(epic.bonusSummary).toBe('+30 credits, +4 parts, +1 cycles');
  });

  it('creates deterministic daily tasks', () => {
    const now = new Date('2026-03-10T09:15:00.000Z');
    const engine = new GameEngine(new SequenceRandomSource([0.0]));

    const task = engine.createActiveTask('DAILY', now);

    expect(task.scope).toBe('DAILY');
    expect(task.key).toBe('RUN_SCANS');
    expect(task.objectiveValue).toBe(3);
    expect(task.id).toBe('daily_2026-03-10_run_scans');
    expect(task.activeFrom.toISOString()).toBe('2026-03-10T00:00:00.000Z');
    expect(task.activeTo.toISOString()).toBe('2026-03-10T23:59:59.999Z');
  });

  it('creates weekly tasks anchored to UTC week boundaries', () => {
    const now = new Date('2026-03-12T09:15:00.000Z');
    const engine = new GameEngine(new SequenceRandomSource([0.0]));

    const task = engine.createActiveTask('WEEKLY', now);

    expect(task.id).toBe('weekly_2026-03-09_run_scans');
    expect(task.activeFrom.toISOString()).toBe('2026-03-09T00:00:00.000Z');
    expect(task.activeTo.toISOString()).toBe('2026-03-15T23:59:59.999Z');
  });

  it('advances only matching task action progress', () => {
    const now = new Date('2026-03-10T09:15:00.000Z');
    const engine = new GameEngine(new SequenceRandomSource([0.34]));
    const task = engine.createActiveTask('DAILY', now);

    expect(task.key).toBe('CONNECT_TARGETS');

    const base = engine.initializeTaskProgress('plr_1', task);
    const mismatch = engine.advanceProgressForAction(base, task, 'SCAN', now);
    expect(mismatch.progressValue).toBe(0);

    const match = engine.advanceProgressForAction(base, task, 'CONNECT', now);
    expect(match.progressValue).toBe(1);
  });

  it('creates a unique active daily objective set', () => {
    const now = new Date('2026-03-10T09:15:00.000Z');
    const engine = new GameEngine(new SequenceRandomSource([0.0, 0.0]));

    const tasks = engine.createActiveTaskSet('DAILY', now);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.key).toBe('RUN_SCANS');
    expect(tasks[1]?.key).toBe('CONNECT_TARGETS');
    expect(new Set(tasks.map((task) => task.id)).size).toBe(2);
  });


  it('ignores non-positive task progress increments', () => {
    const now = new Date('2026-03-10T09:15:00.000Z');
    const engine = new GameEngine(new SequenceRandomSource([0.0]));
    const task = engine.createActiveTask('DAILY', now);
    const base = engine.initializeTaskProgress('plr_1', task);

    const zero = engine.advanceTaskProgress(base, task, 0, now);
    expect(zero.progressValue).toBe(0);
    expect(zero.completedAt).toBeNull();

    const negative = engine.advanceTaskProgress(base, task, -2, now);
    expect(negative.progressValue).toBe(0);
    expect(negative.completedAt).toBeNull();
  });

  it('completes task progress and applies reward', () => {
    const now = new Date('2026-03-10T09:15:00.000Z');
    const engine = new GameEngine(new SequenceRandomSource([0.5]));
    const { player, node } = engine.onboard('123', 'sysop', 'alpha-node', 'RELAY_NODE');
    const task = engine.createActiveTask('DAILY', now);

    const base = engine.initializeTaskProgress(player.id, task);
    const progressed = engine.advanceTaskProgress(base, task, task.objectiveValue, now);

    expect(progressed.completedAt?.toISOString()).toBe(now.toISOString());

    const rewarded = engine.applyTaskReward(node, player, task);
    expect(rewarded.node.wallet.credits).toBe(node.wallet.credits + task.reward.credits);
    expect(rewarded.node.wallet.parts).toBe(node.wallet.parts + task.reward.parts);
    expect(rewarded.player.reputation).toBe(player.reputation + task.reward.reputation);
  });

  it('formats task progress and reward summaries for UX', () => {
    const now = new Date('2026-03-10T09:15:00.000Z');
    const engine = new GameEngine(new SequenceRandomSource([0.0]));
    const task = engine.createActiveTask('DAILY', now);

    expect(engine.formatTaskProgress(task, 2)).toBe('Run scans 2/3 (66%)');
    expect(engine.formatTaskProgress(task, 8)).toBe('Run scans 3/3 (100%)');
    expect(engine.formatTaskReward(task)).toBe('+40 credits, +4 parts, +15 rep');
  });
});

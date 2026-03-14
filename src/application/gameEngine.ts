import type { DiscoveryType, Era, Faction, NodeArchetype, TaskScope } from '../domain/types.js';
import type {
  Collectible,
  Player,
  PlayerNode,
  PlayerTaskProgress,
  ScanResult,
  TaskDefinition,
} from '../domain/entities.js';
import { MathRandomSource, type RandomSource } from './random.js';
import { formatTaskProgressLabel } from './taskPresentation.js';

const BASE_RESOURCES = { credits: 100, data: 25, cycles: 5, parts: 10 };
const DAILY_TASKS: Omit<TaskDefinition, 'id' | 'activeFrom' | 'activeTo'>[] = [
  { scope: 'DAILY', key: 'RUN_SCANS', objectiveValue: 3, reward: { credits: 40, parts: 4, reputation: 15 } },
  { scope: 'DAILY', key: 'CONNECT_TARGETS', objectiveValue: 3, reward: { credits: 45, parts: 3, reputation: 18 } },
  { scope: 'DAILY', key: 'CLAIM_REWARDS', objectiveValue: 2, reward: { credits: 55, parts: 2, reputation: 20 } },
];
const WEEKLY_TASKS: Omit<TaskDefinition, 'id' | 'activeFrom' | 'activeTo'>[] = [
  { scope: 'WEEKLY', key: 'RUN_SCANS', objectiveValue: 12, reward: { credits: 180, parts: 8, reputation: 80 } },
  { scope: 'WEEKLY', key: 'UPGRADE_NODE', objectiveValue: 2, reward: { credits: 120, parts: 10, reputation: 95 } },
];

const ACTIVE_TASK_TARGETS: Record<TaskScope, number> = {
  DAILY: 2,
  WEEKLY: 1,
};

const FACTION_ORDER: Faction[] = ['HELIX_SYNDICATE', 'NULL_SECTOR', 'LATTICE_COLLECTIVE'];


export type FactionTaskDefinition = {
  id: string;
  faction: Faction;
  title: string;
  objective: string;
  requiredRank: number;
  reward: {
    credits: number;
    parts: number;
    factionReputation: number;
  };
};

export type FactionShopItem = {
  id: string;
  faction: Faction;
  name: string;
  requiredRank: number;
  cost: {
    credits: number;
    parts: number;
  };
};

export type ContractTier = 'Tier I' | 'Tier II' | 'Tier III';

export type EraContractUnlock = {
  era: Era;
  maximumTier: ContractTier;
};

const FACTION_TASK_BOARD: Record<Faction, FactionTaskDefinition[]> = {
  HELIX_SYNDICATE: [
    {
      id: 'helix_t1_signal_scrape',
      faction: 'HELIX_SYNDICATE',
      title: 'Signal Scrape Sweep',
      objective: 'Run 3 relay sweeps through Helix-controlled sectors.',
      requiredRank: 1,
      reward: { credits: 90, parts: 4, factionReputation: 14 },
    },
    {
      id: 'helix_t2_backbone_patch',
      faction: 'HELIX_SYNDICATE',
      title: 'Backbone Patch Relay',
      objective: 'Complete 5 secure uplink patches on contested backbone nodes.',
      requiredRank: 2,
      reward: { credits: 150, parts: 7, factionReputation: 22 },
    },
    {
      id: 'helix_t3_core_overwatch',
      faction: 'HELIX_SYNDICATE',
      title: 'Core Overwatch Rotation',
      objective: 'Stabilize 8 high-threat Helix contract points without failure.',
      requiredRank: 3,
      reward: { credits: 220, parts: 12, factionReputation: 30 },
    },
  ],
  NULL_SECTOR: [
    {
      id: 'null_t1_cache_harvest',
      faction: 'NULL_SECTOR',
      title: 'Cache Harvest',
      objective: 'Extract 3 abandoned cache fragments from Null Sector grids.',
      requiredRank: 1,
      reward: { credits: 95, parts: 3, factionReputation: 13 },
    },
    {
      id: 'null_t2_ghost_route',
      faction: 'NULL_SECTOR',
      title: 'Ghost Route Injection',
      objective: 'Deploy 4 stealth relays across blacklisted transit routes.',
      requiredRank: 2,
      reward: { credits: 155, parts: 6, factionReputation: 21 },
    },
    {
      id: 'null_t3_void_sync',
      faction: 'NULL_SECTOR',
      title: 'Void Sync Protocol',
      objective: 'Coordinate 7 synchronized breaches on hardened vault clusters.',
      requiredRank: 3,
      reward: { credits: 230, parts: 11, factionReputation: 29 },
    },
  ],
  LATTICE_COLLECTIVE: [
    {
      id: 'lattice_t1_mesh_maintenance',
      faction: 'LATTICE_COLLECTIVE',
      title: 'Mesh Maintenance',
      objective: 'Repair 3 degraded lattice mesh anchors in civic sectors.',
      requiredRank: 1,
      reward: { credits: 88, parts: 5, factionReputation: 15 },
    },
    {
      id: 'lattice_t2_beacon_alignment',
      faction: 'LATTICE_COLLECTIVE',
      title: 'Beacon Alignment',
      objective: 'Realign 5 data beacons to restore collective routing accuracy.',
      requiredRank: 2,
      reward: { credits: 148, parts: 8, factionReputation: 23 },
    },
    {
      id: 'lattice_t3_consensus_uplink',
      faction: 'LATTICE_COLLECTIVE',
      title: 'Consensus Uplink',
      objective: 'Bring 8 encrypted civic nodes online under consensus timing.',
      requiredRank: 3,
      reward: { credits: 215, parts: 13, factionReputation: 31 },
    },
  ],
};

const FACTION_SHOP_BOARD: Record<Faction, FactionShopItem[]> = {
  HELIX_SYNDICATE: [
    {
      id: 'helix_shop_modem_amp_i',
      faction: 'HELIX_SYNDICATE',
      name: 'Helix Modem Amplifier I',
      requiredRank: 1,
      cost: { credits: 120, parts: 8 },
    },
    {
      id: 'helix_shop_modem_amp_ii',
      faction: 'HELIX_SYNDICATE',
      name: 'Helix Modem Amplifier II',
      requiredRank: 2,
      cost: { credits: 180, parts: 12 },
    },
    {
      id: 'helix_shop_security_kernel',
      faction: 'HELIX_SYNDICATE',
      name: 'Helix Security Kernel',
      requiredRank: 3,
      cost: { credits: 260, parts: 18 },
    },
  ],
  NULL_SECTOR: [
    {
      id: 'null_shop_siphon_suite',
      faction: 'NULL_SECTOR',
      name: 'Null Siphon Suite',
      requiredRank: 1,
      cost: { credits: 115, parts: 9 },
    },
    {
      id: 'null_shop_route_masker',
      faction: 'NULL_SECTOR',
      name: 'Null Route Masker',
      requiredRank: 2,
      cost: { credits: 175, parts: 13 },
    },
    {
      id: 'null_shop_void_carapace',
      faction: 'NULL_SECTOR',
      name: 'Null Void Carapace',
      requiredRank: 3,
      cost: { credits: 255, parts: 19 },
    },
  ],
  LATTICE_COLLECTIVE: [
    {
      id: 'lattice_shop_mesh_lens',
      faction: 'LATTICE_COLLECTIVE',
      name: 'Lattice Mesh Lens',
      requiredRank: 1,
      cost: { credits: 118, parts: 8 },
    },
    {
      id: 'lattice_shop_beacon_array',
      faction: 'LATTICE_COLLECTIVE',
      name: 'Lattice Beacon Array',
      requiredRank: 2,
      cost: { credits: 178, parts: 12 },
    },
    {
      id: 'lattice_shop_consensus_core',
      faction: 'LATTICE_COLLECTIVE',
      name: 'Lattice Consensus Core',
      requiredRank: 3,
      cost: { credits: 252, parts: 18 },
    },
  ],
};

const ERA_MAX_CONTRACT_TIER: Record<Era, ContractTier> = {
  DIAL_UP: 'Tier I',
  BULLETIN_RELAY: 'Tier II',
  EARLY_INTERNET: 'Tier III',
  MODERN_GRID: 'Tier III',
};

const CONTRACT_TIERS: ContractTier[] = ['Tier I', 'Tier II', 'Tier III'];

export class GameEngine {
  constructor(private readonly random: RandomSource = new MathRandomSource()) {}

  onboard(discordUserId: string, handle: string, nodeName: string, archetype: NodeArchetype): { player: Player; node: PlayerNode } {
    const playerId = `plr_${discordUserId}`;
    const now = new Date();

    const player: Player = {
      id: playerId,
      discordUserId,
      handle,
      currentEra: 'DIAL_UP',
      reputation: 0,
      createdAt: now,
    };

    const node: PlayerNode = {
      id: `node_${discordUserId}`,
      playerId,
      name: nodeName,
      archetype,
      integrity: 100,
      bandwidth: 1,
      storage: 1,
      processing: 1,
      security: 1,
      wallet: { ...BASE_RESOURCES },
    };

    return { player, node };
  }

  scan(playerId: string): ScanResult {
    const discoveries: DiscoveryType[] = ['ABANDONED_RELAY', 'VULNERABLE_NODE', 'ARCHIVE_CACHE', 'FACTION_CONTRACT'];
    const discoveryType = discoveries[Math.floor(this.random.next() * discoveries.length)];

    return {
      id: `scan_${Date.now()}`,
      playerId,
      discoveryType,
      threatLevel: Math.ceil(this.random.next() * 3),
      rewardHint: this.rewardHint(discoveryType),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
  }

  connect(scan: ScanResult, now: Date = new Date()): ScanResult {
    if (scan.expiresAt.getTime() <= now.getTime()) {
      throw new Error('Target lock expired. Run `.sh scan` again.');
    }
    return scan;
  }

  claim(node: PlayerNode, discoveryType: DiscoveryType): PlayerNode {
    const next = structuredClone(node);
    switch (discoveryType) {
      case 'ABANDONED_RELAY':
        next.wallet.credits += 35;
        next.wallet.parts += 4;
        break;
      case 'VULNERABLE_NODE':
        next.wallet.data += 20;
        next.wallet.cycles += 2;
        break;
      case 'ARCHIVE_CACHE':
        next.wallet.data += 40;
        next.wallet.credits += 20;
        break;
      case 'FACTION_CONTRACT':
        next.wallet.credits += 50;
        next.wallet.cycles += 1;
        break;
    }
    return next;
  }

  resolveFactionContract(threatLevel: number): { faction: Faction; reputationGain: number } {
    const normalizedThreat = Math.max(1, Math.min(threatLevel, 3));
    const faction = FACTION_ORDER[Math.floor(this.random.next() * FACTION_ORDER.length)] ?? 'HELIX_SYNDICATE';

    return {
      faction,
      reputationGain: 8 + normalizedThreat * 4,
    };
  }


  listFactionTasks(faction: Faction, rank: number): { available: FactionTaskDefinition[]; locked: FactionTaskDefinition[] } {
    const board = FACTION_TASK_BOARD[faction] ?? [];
    const available = board.filter((task) => task.requiredRank <= rank);
    const locked = board.filter((task) => task.requiredRank > rank);

    return { available, locked };
  }

  listFactionShopItems(faction: Faction, rank: number): { available: FactionShopItem[]; locked: FactionShopItem[] } {
    const board = FACTION_SHOP_BOARD[faction] ?? [];
    const available = board.filter((item) => item.requiredRank <= rank);
    const locked = board.filter((item) => item.requiredRank > rank);

    return { available, locked };
  }

  factionContractTierFor(rank: number, era: Era): { availableTier: ContractTier; nextRankUnlock: string; eraGate: EraContractUnlock | null } {
    const rankTier: ContractTier = rank >= 3 ? 'Tier III' : rank >= 2 ? 'Tier II' : 'Tier I';
    const eraTier = ERA_MAX_CONTRACT_TIER[era];
    const availableTier = CONTRACT_TIERS[Math.min(CONTRACT_TIERS.indexOf(rankTier), CONTRACT_TIERS.indexOf(eraTier))] ?? 'Tier I';
    const nextRankUnlock = rank >= 3 ? 'MAX' : `Rank ${rank + 1}`;
    const eraGate = CONTRACT_TIERS.indexOf(rankTier) > CONTRACT_TIERS.indexOf(eraTier) ? { era, maximumTier: eraTier } : null;

    return { availableTier, nextRankUnlock, eraGate };
  }

  createActiveTask(scope: TaskScope, now: Date = new Date()): TaskDefinition {
    const pool = this.taskPool(scope);
    const template = pool[Math.floor(this.random.next() * pool.length)];
    const { activeFrom, activeTo } = this.getTaskWindow(scope, now);
    const windowToken = activeFrom.toISOString().slice(0, 10);

    return {
      ...template,
      id: `${scope.toLowerCase()}_${windowToken}_${template.key.toLowerCase()}`,
      activeFrom,
      activeTo,
    };
  }

  createActiveTaskSet(scope: TaskScope, now: Date = new Date()): TaskDefinition[] {
    const pool = [...this.taskPool(scope)];
    const targetCount = Math.min(ACTIVE_TASK_TARGETS[scope], pool.length);
    const selected: Omit<TaskDefinition, 'id' | 'activeFrom' | 'activeTo'>[] = [];

    while (selected.length < targetCount) {
      const choiceIndex = Math.floor(this.random.next() * pool.length);
      const [picked] = pool.splice(choiceIndex, 1);
      if (picked) {
        selected.push(picked);
      }
    }

    const { activeFrom, activeTo } = this.getTaskWindow(scope, now);
    const windowToken = activeFrom.toISOString().slice(0, 10);

    return selected.map((template) => ({
      ...template,
      id: `${scope.toLowerCase()}_${windowToken}_${template.key.toLowerCase()}`,
      activeFrom,
      activeTo,
    }));
  }

  activeTaskTarget(scope: TaskScope): number {
    return ACTIVE_TASK_TARGETS[scope];
  }

  private getTaskWindow(scope: TaskScope, now: Date): { activeFrom: Date; activeTo: Date } {

    const activeFrom = new Date(now);
    activeFrom.setUTCHours(0, 0, 0, 0);

    const activeTo = new Date(activeFrom);
    activeTo.setUTCHours(23, 59, 59, 999);

    if (scope === 'WEEKLY') {
      const dayOffset = (activeFrom.getUTCDay() + 6) % 7;
      activeFrom.setUTCDate(activeFrom.getUTCDate() - dayOffset);
      activeTo.setTime(activeFrom.getTime());
      activeTo.setUTCDate(activeFrom.getUTCDate() + 6);
      activeTo.setUTCHours(23, 59, 59, 999);
    }

    return { activeFrom, activeTo };
  }

  private taskPool(scope: TaskScope): Omit<TaskDefinition, 'id' | 'activeFrom' | 'activeTo'>[] {
    return scope === 'DAILY' ? DAILY_TASKS : WEEKLY_TASKS;
  }

  initializeTaskProgress(playerId: string, task: TaskDefinition): PlayerTaskProgress {
    return {
      playerId,
      taskId: task.id,
      progressValue: 0,
      completedAt: null,
    };
  }

  advanceTaskProgress(progress: PlayerTaskProgress, task: TaskDefinition, increment: number, now: Date = new Date()): PlayerTaskProgress {
    if (progress.completedAt) {
      return progress;
    }

    if (increment <= 0) {
      return progress;
    }

    const nextValue = Math.min(progress.progressValue + increment, task.objectiveValue);
    return {
      ...progress,
      progressValue: nextValue,
      completedAt: nextValue >= task.objectiveValue ? now : null,
    };
  }

  advanceProgressForAction(
    progress: PlayerTaskProgress,
    task: TaskDefinition,
    action: 'SCAN' | 'CONNECT' | 'CLAIM' | 'UPGRADE',
    now: Date = new Date(),
  ): PlayerTaskProgress {
    if (!this.matchesAction(task.key, action)) {
      return progress;
    }

    return this.advanceTaskProgress(progress, task, 1, now);
  }

  applyTaskReward(node: PlayerNode, player: Player, task: TaskDefinition): { node: PlayerNode; player: Player } {
    const nextNode = structuredClone(node);
    const nextPlayer = structuredClone(player);

    nextNode.wallet.credits += task.reward.credits;
    nextNode.wallet.parts += task.reward.parts;
    nextPlayer.reputation += task.reward.reputation;

    return { node: nextNode, player: nextPlayer };
  }

  formatTaskProgress(task: TaskDefinition, progressValue: number): string {
    return formatTaskProgressLabel(task, progressValue);
  }

  formatTaskReward(task: TaskDefinition): string {
    return `+${task.reward.credits} credits, +${task.reward.parts} parts, +${task.reward.reputation} rep`;
  }

  rollCollectible(playerId: string): Collectible | null {
    if (this.random.next() >= 0.15) return null;

    const categories: Collectible['category'][] = ['ANSI_RELIC', 'ARCHIVED_LOG', 'MALWARE_SPECIMEN'];
    const rarities: Collectible['rarity'][] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC'];

    const category = categories[Math.floor(this.random.next() * categories.length)];
    const rarity = rarities[Math.floor(this.random.next() * rarities.length)];

    return {
      id: `col_${Date.now()}_${Math.floor(this.random.next() * 10000)}`,
      playerId,
      category,
      rarity,
      name: `${rarity.toLowerCase()} ${category.toLowerCase().replace('_', ' ')}`,
      acquiredAt: new Date(),
    };
  }

  applyCollectibleRarityEffect(node: PlayerNode, collectible: Collectible): { node: PlayerNode; bonusSummary: string } {
    const nextNode = structuredClone(node);

    if (collectible.rarity === 'UNCOMMON') {
      nextNode.wallet.data += 10;
      return { node: nextNode, bonusSummary: '+10 data' };
    }

    if (collectible.rarity === 'RARE') {
      nextNode.wallet.credits += 15;
      nextNode.wallet.parts += 2;
      return { node: nextNode, bonusSummary: '+15 credits, +2 parts' };
    }

    if (collectible.rarity === 'EPIC') {
      nextNode.wallet.credits += 30;
      nextNode.wallet.parts += 4;
      nextNode.wallet.cycles += 1;
      return { node: nextNode, bonusSummary: '+30 credits, +4 parts, +1 cycles' };
    }

    return { node: nextNode, bonusSummary: 'no bonus' };
  }

  upgrade(node: PlayerNode, path: 'MODEM' | 'STORAGE' | 'CPU'): PlayerNode {
    const next = structuredClone(node);
    if (next.wallet.credits < 50 || next.wallet.parts < 5) {
      throw new Error('Insufficient credits or parts.');
    }
    next.wallet.credits -= 50;
    next.wallet.parts -= 5;

    if (path === 'MODEM') next.bandwidth += 1;
    if (path === 'STORAGE') next.storage += 1;
    if (path === 'CPU') next.processing += 1;
    return next;
  }

  private matchesAction(taskKey: TaskDefinition['key'], action: 'SCAN' | 'CONNECT' | 'CLAIM' | 'UPGRADE'): boolean {
    if (taskKey === 'RUN_SCANS') return action === 'SCAN';
    if (taskKey === 'CONNECT_TARGETS') return action === 'CONNECT';
    if (taskKey === 'CLAIM_REWARDS') return action === 'CLAIM';
    if (taskKey === 'UPGRADE_NODE') return action === 'UPGRADE';
    return false;
  }

  private rewardHint(type: DiscoveryType): string {
    if (type === 'ARCHIVE_CACHE') return 'Possible ANSI relic trace detected.';
    if (type === 'VULNERABLE_NODE') return 'Low firewall signature, high data yield.';
    if (type === 'FACTION_CONTRACT') return 'Faction packet waiting for handshake.';
    return 'Parts and credits likely recoverable.';
  }
}

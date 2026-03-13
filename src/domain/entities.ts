import type { DiscoveryType, Era, NodeArchetype, ResourceWallet, TaskKey, TaskScope } from './types.js';

export interface Player {
  id: string;
  discordUserId: string;
  handle: string;
  currentEra: Era;
  reputation: number;
  createdAt: Date;
}

export interface PlayerNode {
  id: string;
  playerId: string;
  name: string;
  archetype: NodeArchetype;
  integrity: number;
  bandwidth: number;
  storage: number;
  processing: number;
  security: number;
  wallet: ResourceWallet;
}

export interface ScanResult {
  id: string;
  playerId: string;
  discoveryType: DiscoveryType;
  threatLevel: number;
  rewardHint: string;
  expiresAt: Date;
}

export interface Collectible {
  id: string;
  playerId: string;
  category: 'ANSI_RELIC' | 'MALWARE_SPECIMEN' | 'ARCHIVED_LOG';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC';
  name: string;
  acquiredAt: Date;
}

export interface TaskDefinition {
  id: string;
  scope: TaskScope;
  key: TaskKey;
  objectiveValue: number;
  reward: {
    credits: number;
    parts: number;
    reputation: number;
  };
  activeFrom: Date;
  activeTo: Date;
}

export interface PlayerTaskProgress {
  playerId: string;
  taskId: string;
  progressValue: number;
  completedAt: Date | null;
}

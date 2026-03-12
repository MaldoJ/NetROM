import type { Player, PlayerNode, ScanResult } from '../../domain/entities.js';

export interface PlayerRepository {
  create(player: Player): Promise<void>;
  findByDiscordUserId(discordUserId: string): Promise<Player | null>;
  findById(id: string): Promise<Player | null>;
}

export interface PlayerNodeRepository {
  create(node: PlayerNode): Promise<void>;
  findByPlayerId(playerId: string): Promise<PlayerNode | null>;
  update(node: PlayerNode): Promise<void>;
}

export interface ScanResultRepository {
  create(scanResult: ScanResult): Promise<void>;
  findLatestActiveByPlayerId(playerId: string, now: Date): Promise<ScanResult | null>;
  markResolved(id: string): Promise<void>;
}

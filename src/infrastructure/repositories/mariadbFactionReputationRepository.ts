import type { Connection } from 'mariadb';
import type { Faction } from '../../domain/types.js';
import type { PlayerFactionReputation } from '../../domain/entities.js';

type FactionReputationRow = {
  id: string;
  player_id: string;
  faction: Faction;
  reputation: number;
  rank_level: number;
  updated_at: Date;
};

const FACTIONS: Faction[] = ['HELIX_SYNDICATE', 'NULL_SECTOR', 'LATTICE_COLLECTIVE'];

export class MariaDbFactionReputationRepository {
  constructor(private readonly connection: Connection) {}

  async ensurePlayerRows(playerId: string): Promise<void> {
    for (const faction of FACTIONS) {
      await this.connection.query(
        `INSERT IGNORE INTO player_faction_reputation (id, player_id, faction, reputation, rank_level)
         VALUES (?, ?, ?, 0, 1)`,
        [`fac_${playerId}_${faction.toLowerCase()}`, playerId, faction],
      );
    }
  }

  async listByPlayerId(playerId: string): Promise<PlayerFactionReputation[]> {
    const rows = await this.connection.query<FactionReputationRow[]>(
      `SELECT id, player_id, faction, reputation, rank_level, updated_at
       FROM player_faction_reputation
       WHERE player_id = ?
       ORDER BY reputation DESC, faction ASC`,
      [playerId],
    );

    return rows.map((row) => ({
      playerId: row.player_id,
      faction: row.faction,
      reputation: row.reputation,
      rank: row.rank_level,
      updatedAt: new Date(row.updated_at),
    }));
  }
}

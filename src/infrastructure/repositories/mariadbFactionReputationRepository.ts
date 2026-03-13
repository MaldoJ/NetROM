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


  async addReputation(playerId: string, faction: Faction, delta: number): Promise<PlayerFactionReputation | null> {
    if (delta <= 0) return this.findByPlayerIdAndFaction(playerId, faction);

    await this.ensurePlayerRows(playerId);

    await this.connection.query(
      `UPDATE player_faction_reputation
       SET reputation = reputation + ?,
           rank_level = GREATEST(1, FLOOR((reputation + ?) / 100) + 1)
       WHERE player_id = ? AND faction = ?`,
      [delta, delta, playerId, faction],
    );

    return this.findByPlayerIdAndFaction(playerId, faction);
  }

  async findByPlayerIdAndFaction(playerId: string, faction: Faction): Promise<PlayerFactionReputation | null> {
    const rows = await this.connection.query<FactionReputationRow[]>(
      `SELECT id, player_id, faction, reputation, rank_level, updated_at
       FROM player_faction_reputation
       WHERE player_id = ? AND faction = ?
       LIMIT 1`,
      [playerId, faction],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      playerId: row.player_id,
      faction: row.faction,
      reputation: row.reputation,
      rank: row.rank_level,
      updatedAt: new Date(row.updated_at),
    };
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

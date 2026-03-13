import type { Connection } from 'mariadb';
import type { Collectible } from '../../domain/entities.js';

type CollectibleSummaryRow = {
  total: number;
  rare_or_better: number;
};

export type CollectibleSummary = {
  total: number;
  rareOrBetter: number;
};

export class MariaDbCollectibleRepository {
  constructor(private readonly connection: Connection) {}

  async create(collectible: Collectible): Promise<void> {
    await this.connection.query(
      `INSERT INTO collectibles (id, player_id, category, rarity, name, acquired_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        collectible.id,
        collectible.playerId,
        collectible.category,
        collectible.rarity,
        collectible.name,
        collectible.acquiredAt,
      ],
    );
  }

  async getSummaryByPlayerId(playerId: string): Promise<CollectibleSummary> {
    const rows = await this.connection.query<CollectibleSummaryRow[]>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN rarity IN ('RARE', 'EPIC') THEN 1 ELSE 0 END) AS rare_or_better
       FROM collectibles
       WHERE player_id = ?`,
      [playerId],
    );

    const row = rows[0];

    return {
      total: Number(row?.total ?? 0),
      rareOrBetter: Number(row?.rare_or_better ?? 0),
    };
  }
}

import type { Connection } from 'mariadb';
import type { Collectible } from '../../domain/entities.js';

type CollectibleSummaryRow = {
  total: number;
  rare_or_better: number;
  epic_total: number;
  ansi_total: number;
  archive_total: number;
  malware_total: number;
};

export type CollectibleSummary = {
  total: number;
  rareOrBetter: number;
  epicTotal: number;
  categoriesUnlocked: number;
  completedSets: number;
};

type CollectibleRecordRow = {
  id: string;
  player_id: string;
  category: Collectible['category'];
  rarity: Collectible['rarity'];
  name: string;
  acquired_at: Date;
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
        SUM(CASE WHEN rarity IN ('RARE', 'EPIC') THEN 1 ELSE 0 END) AS rare_or_better,
        SUM(CASE WHEN rarity = 'EPIC' THEN 1 ELSE 0 END) AS epic_total,
        SUM(CASE WHEN category = 'ANSI_RELIC' THEN 1 ELSE 0 END) AS ansi_total,
        SUM(CASE WHEN category = 'ARCHIVED_LOG' THEN 1 ELSE 0 END) AS archive_total,
        SUM(CASE WHEN category = 'MALWARE_SPECIMEN' THEN 1 ELSE 0 END) AS malware_total
       FROM collectibles
       WHERE player_id = ?`,
      [playerId],
    );

    const row = rows[0];
    const ansiTotal = Number(row?.ansi_total ?? 0);
    const archiveTotal = Number(row?.archive_total ?? 0);
    const malwareTotal = Number(row?.malware_total ?? 0);
    const categoriesUnlocked = [ansiTotal, archiveTotal, malwareTotal].filter((count) => count > 0).length;
    const completedSets = Math.min(ansiTotal, archiveTotal, malwareTotal);

    return {
      total: Number(row?.total ?? 0),
      rareOrBetter: Number(row?.rare_or_better ?? 0),
      epicTotal: Number(row?.epic_total ?? 0),
      categoriesUnlocked,
      completedSets,
    };
  }

  async listRecentByPlayerId(playerId: string, limit = 5): Promise<Collectible[]> {
    const rows = await this.connection.query<CollectibleRecordRow[]>(
      `SELECT id, player_id, category, rarity, name, acquired_at
       FROM collectibles
       WHERE player_id = ?
       ORDER BY acquired_at DESC
       LIMIT ?`,
      [playerId, limit],
    );

    return rows.map((row) => ({
      id: row.id,
      playerId: row.player_id,
      category: row.category,
      rarity: row.rarity,
      name: row.name,
      acquiredAt: new Date(row.acquired_at),
    }));
  }
}

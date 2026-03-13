import type { Connection } from 'mariadb';
import type { Collectible } from '../../domain/entities.js';

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
}

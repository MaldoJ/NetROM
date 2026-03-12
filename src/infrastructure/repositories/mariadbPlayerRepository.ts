import type mariadb from 'mariadb';
import type { Player } from '../../domain/entities.js';
import type { PlayerRepository } from '../../application/ports/repositories.js';

type PlayerRow = {
  id: string;
  discord_user_id: string;
  handle: string;
  current_era: Player['currentEra'];
  reputation: number;
  created_at: Date;
};

export class MariaDbPlayerRepository implements PlayerRepository {
  constructor(private readonly connection: mariadb.Connection) {}

  async create(player: Player): Promise<void> {
    await this.connection.query(
      `INSERT INTO players (id, discord_user_id, handle, current_era, reputation, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [player.id, player.discordUserId, player.handle, player.currentEra, player.reputation, player.createdAt],
    );
  }

  async findByDiscordUserId(discordUserId: string): Promise<Player | null> {
    const rows = await this.connection.query<PlayerRow[]>(
      `SELECT id, discord_user_id, handle, current_era, reputation, created_at
       FROM players WHERE discord_user_id = ? LIMIT 1`,
      [discordUserId],
    );

    return rows[0] ? mapPlayer(rows[0]) : null;
  }

  async findById(id: string): Promise<Player | null> {
    const rows = await this.connection.query<PlayerRow[]>(
      `SELECT id, discord_user_id, handle, current_era, reputation, created_at
       FROM players WHERE id = ? LIMIT 1`,
      [id],
    );

    return rows[0] ? mapPlayer(rows[0]) : null;
  }
}

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    discordUserId: row.discord_user_id,
    handle: row.handle,
    currentEra: row.current_era,
    reputation: row.reputation,
    createdAt: new Date(row.created_at),
  };
}

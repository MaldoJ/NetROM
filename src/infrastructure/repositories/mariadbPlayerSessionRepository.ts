import type { Connection } from 'mariadb';

type PlayerSessionRow = {
  id: string;
  player_id: string;
  guild_id: string;
  core_channel_id: string;
  thread_channel_id: string;
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: Date;
};

export type PlayerSession = {
  id: string;
  playerId: string;
  guildId: string;
  coreChannelId: string;
  threadChannelId: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
};

export class MariaDbPlayerSessionRepository {
  constructor(private readonly connection: Connection) {}

  async create(session: Omit<PlayerSession, 'createdAt'>): Promise<void> {
    await this.connection.query(
      `INSERT INTO player_sessions (id, player_id, guild_id, core_channel_id, thread_channel_id, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.id, session.playerId, session.guildId, session.coreChannelId, session.threadChannelId, session.status],
    );
  }

  async archiveActiveByPlayerId(playerId: string): Promise<void> {
    await this.connection.query(
      `UPDATE player_sessions
       SET status = 'ARCHIVED'
       WHERE player_id = ? AND status = 'ACTIVE'`,
      [playerId],
    );
  }

  async findActiveByPlayerId(playerId: string): Promise<PlayerSession | null> {
    const rows = await this.connection.query<PlayerSessionRow[]>(
      `SELECT id, player_id, guild_id, core_channel_id, thread_channel_id, status, created_at
       FROM player_sessions
       WHERE player_id = ? AND status = 'ACTIVE'
       LIMIT 1`,
      [playerId],
    );

    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      playerId: rows[0].player_id,
      guildId: rows[0].guild_id,
      coreChannelId: rows[0].core_channel_id,
      threadChannelId: rows[0].thread_channel_id,
      status: rows[0].status,
      createdAt: new Date(rows[0].created_at),
    };
  }
}

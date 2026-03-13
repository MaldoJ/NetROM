import type { Connection } from 'mariadb';

export class MariaDbPlayerTaskProgressRepository {
  constructor(private readonly connection: Connection) {}

  async incrementProgress(playerId: string, taskId: string, amount: number): Promise<void> {
    await this.connection.query(
      `INSERT INTO player_task_progress (id, player_id, task_id, progress_value)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE progress_value = progress_value + VALUES(progress_value)`,
      [`ptp_${playerId}_${taskId}`, playerId, taskId, amount],
    );
  }
}

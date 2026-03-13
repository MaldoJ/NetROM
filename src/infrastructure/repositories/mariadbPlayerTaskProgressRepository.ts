import type { Connection } from 'mariadb';

export type TaskProgressRow = {
  id: string;
  player_id: string;
  task_id: string;
  progress_value: number;
  completed_at: Date | null;
  reward_claimed_at: Date | null;
};

export class MariaDbPlayerTaskProgressRepository {
  constructor(private readonly connection: Connection) {}

  async getOrCreate(playerId: string, taskId: string): Promise<TaskProgressRow> {
    await this.connection.query(
      `INSERT INTO player_task_progress (id, player_id, task_id, progress_value)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE id = id`,
      [`ptp_${playerId}_${taskId}`, playerId, taskId],
    );

    const rows = await this.connection.query<TaskProgressRow[]>(
      `SELECT id, player_id, task_id, progress_value, completed_at, reward_claimed_at
       FROM player_task_progress
       WHERE player_id = ? AND task_id = ?
       LIMIT 1`,
      [playerId, taskId],
    );

    return rows[0] as TaskProgressRow;
  }

  async setProgress(playerId: string, taskId: string, progressValue: number, completedAt: Date | null): Promise<void> {
    await this.connection.query(
      `UPDATE player_task_progress
       SET progress_value = ?, completed_at = ?
       WHERE player_id = ? AND task_id = ?`,
      [progressValue, completedAt, playerId, taskId],
    );
  }

  async markRewardClaimed(playerId: string, taskId: string, claimedAt: Date): Promise<void> {
    await this.connection.query(
      `UPDATE player_task_progress
       SET reward_claimed_at = ?
       WHERE player_id = ? AND task_id = ? AND completed_at IS NOT NULL AND reward_claimed_at IS NULL`,
      [claimedAt, playerId, taskId],
    );
  }
}

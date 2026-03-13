import type { Connection } from 'mariadb';

type TaskRow = {
  id: string;
  task_key: string;
};

export class MariaDbTaskRepository {
  constructor(private readonly connection: Connection) {}

  async findActiveTaskIds(now: Date): Promise<string[]> {
    const rows = await this.connection.query<TaskRow[]>(
      `SELECT id, task_key
       FROM tasks
       WHERE active_from <= ? AND active_to >= ?`,
      [now, now],
    );
    return rows.map((row) => row.id);
  }
}

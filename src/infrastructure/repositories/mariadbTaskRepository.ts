import type { Connection } from 'mariadb';
import type { TaskDefinition } from '../../domain/entities.js';

type TaskRow = {
  id: string;
  scope: TaskDefinition['scope'];
  task_key: TaskDefinition['key'];
  objective_value: number;
  reward_json: string;
  active_from: Date;
  active_to: Date;
};

export class MariaDbTaskRepository {
  constructor(private readonly connection: Connection) {}

  async findActiveTaskIds(now: Date): Promise<string[]> {
    const rows = await this.connection.query<TaskRow[]>(
      `SELECT id, scope, task_key, objective_value, reward_json, active_from, active_to
       FROM tasks
       WHERE active_from <= ? AND active_to >= ?`,
      [now, now],
    );
    return rows.map((row) => row.id);
  }

  async findActive(now: Date): Promise<TaskDefinition[]> {
    const rows = await this.connection.query<TaskRow[]>(
      `SELECT id, scope, task_key, objective_value, reward_json, active_from, active_to
       FROM tasks
       WHERE active_from <= ? AND active_to >= ?`,
      [now, now],
    );

    return rows.map((row) => ({
      id: row.id,
      scope: row.scope,
      key: row.task_key,
      objectiveValue: row.objective_value,
      reward: JSON.parse(row.reward_json) as TaskDefinition['reward'],
      activeFrom: new Date(row.active_from),
      activeTo: new Date(row.active_to),
    }));
  }
}

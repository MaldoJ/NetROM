import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Connection, PoolConnection } from 'mariadb';
import { createDbPool } from './mariadb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationDir = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(connection: PoolConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function run(): Promise<void> {
  const pool = createDbPool();
  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await ensureMigrationsTable(connection);

    const files = (await fs.readdir(migrationDir))
      .filter((file: string) => file.endsWith('.sql'))
      .sort((a: string, b: string) => a.localeCompare(b));

    for (const file of files) {
      const rows = await connection.query<{ filename: string }[]>(
        'SELECT filename FROM schema_migrations WHERE filename = ?',
        [file],
      );

      if (rows.length > 0) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
      const statements = sql
        .split(/;\s*\n/g)
        .map((statement: string) => statement.trim())
        .filter((statement: string) => statement.length > 0);

      await connection.beginTransaction();
      try {
        for (const statement of statements) {
          await connection.query(statement);
        }
        await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    console.log('Database migrations applied successfully.');
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

run().catch((error: unknown) => {
  console.error('Migration failed.', error);
  process.exitCode = 1;
});

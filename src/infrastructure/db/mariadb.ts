import mariadb from 'mariadb';

export type DbPool = mariadb.Pool;

export function createDbPool(): DbPool {
  return mariadb.createPool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'netrom',
    password: process.env.DB_PASSWORD ?? 'netrom',
    database: process.env.DB_NAME ?? 'netrom',
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 5),
  });
}

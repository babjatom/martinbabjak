import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

let _pool: Pool | null = null;

export function getPool(): Pool {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is required for Postgres');
  }
  if (!_pool) {
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export function setPool(pool: Pool | null): void {
  _pool = pool;
}

export async function applyMigrations(pool: Pool): Promise<void> {
  const sql = readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
  await pool.query(sql);
  const insert = `
    INSERT INTO page_config (key, value) VALUES ($1, $2)
    ON CONFLICT (key) DO NOTHING
  `;
  await pool.query(insert, ['title', 'Book a Session']);
  await pool.query(insert, ['description', 'Pick a time slot that works for you.']);
  await pool.query(insert, ['bg_image_url', '']);
}

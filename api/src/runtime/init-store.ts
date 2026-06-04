import { setStore } from '../store';
import { seedSlotsAsync } from '../slots';
import { getPool, applyMigrations } from '../postgres/client';
import { PostgresStore } from '../postgres/PostgresStore';

/**
 * Wire the active Store for Route Handlers or serverless invocations.
 * Uses Postgres when DATABASE_URL is set; otherwise in-memory SQLite (dynamic import).
 */
export async function initApiStore(): Promise<void> {
  if (process.env['DATABASE_URL']) {
    const pool = getPool();
    await applyMigrations(pool);
    setStore(new PostgresStore(pool));
    await seedSlotsAsync();
    return;
  }
  const { initApiStoreSqlite } = await import('./init-store-sqlite.js');
  await initApiStoreSqlite();
}

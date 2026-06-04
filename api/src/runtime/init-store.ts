import { setStore } from '../store-registry';
import { seedSlotsAsync } from '../slots';
import { getPool, applyMigrations } from '../postgres/client';
import { PostgresStore } from '../postgres/PostgresStore';

/** Wire Postgres store. Requires `DATABASE_URL`. */
export async function initApiStore(): Promise<void> {
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL is required');
  }
  const pool = getPool();
  await applyMigrations(pool);
  setStore(new PostgresStore(pool));
  await seedSlotsAsync();
}

import { applyMigrations, getPool } from '../../../api/src/postgres/client';
import { PostgresStore } from '../../../api/src/postgres/PostgresStore';
import { setStore } from '../../../api/src/store-registry';
import { shouldSeedDemoSlots } from '../../../api/src/runtime/demo-seed';
import { seedSlotsAsync } from '../../../api/src/slots';

/**
 * Production / Vercel: requires DATABASE_URL (hosted Postgres).
 * Does not import better-sqlite3 or api/db.ts.
 */
export async function initApiStore(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for API routes');
  }
  const pool = getPool();
  await applyMigrations(pool);
  setStore(new PostgresStore(pool));
  if (shouldSeedDemoSlots()) {
    await seedSlotsAsync();
  }
}

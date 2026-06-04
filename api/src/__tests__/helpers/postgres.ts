import { beforeAll, beforeEach, afterAll } from 'vitest';
import { getPool, applyMigrations, closePool } from '../../postgres/client';
import { PostgresStore } from '../../postgres/PostgresStore';
import { setStore } from '../../store-registry';
import { seedSlotsAsync } from '../../slots';

export const hasPostgres = Boolean(process.env['DATABASE_URL']);

export function usePostgresTestStore(): void {
  beforeAll(async () => {
    if (!hasPostgres) return;
    await applyMigrations(getPool());
  });

  beforeEach(async () => {
    if (!hasPostgres) return;
    const pool = getPool();
    await pool.query('TRUNCATE bookings, slots RESTART IDENTITY CASCADE');
    setStore(new PostgresStore(pool));
    await seedSlotsAsync();
  });

  afterAll(async () => {
    if (!hasPostgres) return;
    setStore(null);
    await closePool();
  });
}

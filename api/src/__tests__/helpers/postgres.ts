import { beforeAll, beforeEach, afterAll } from 'vitest';
import { getPool, applyMigrations, closePool } from '../../postgres/client';
import { PostgresStore } from '../../postgres/PostgresStore';
import { setStore } from '../../store-registry';
import { seedSlotsAsync } from '../../slots';

export const hasPostgres = Boolean(process.env['DATABASE_URL']);

async function resetPageConfigDefaults(): Promise<void> {
  const pool = getPool();
  const rows: [string, string][] = [
    ['title', 'Book a Session'],
    ['description', 'Pick a time slot that works for you.'],
    ['bg_image_url', ''],
  ];
  for (const [key, value] of rows) {
    await pool.query(
      `INSERT INTO page_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
  }
}

export function usePostgresTestStore(): void {
  beforeAll(async () => {
    if (!hasPostgres) return;
    await applyMigrations(getPool());
  });

  beforeEach(async () => {
    if (!hasPostgres) return;
    const pool = getPool();
    await pool.query('TRUNCATE bookings, slots RESTART IDENTITY CASCADE');
    await resetPageConfigDefaults();
    setStore(new PostgresStore(pool));
    await seedSlotsAsync();
  });

  afterAll(async () => {
    if (!hasPostgres) return;
    setStore(null);
    await closePool();
  });
}

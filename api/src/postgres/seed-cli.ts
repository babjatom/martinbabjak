import { getPool, applyMigrations, closePool } from './client';
import { PostgresStore } from './PostgresStore';
import { setStore } from '../store-registry';
import { seedSlotsAsync } from '../slots';

async function main(): Promise<void> {
  const pool = getPool();
  await applyMigrations(pool);
  setStore(new PostgresStore(pool));
  await seedSlotsAsync();
  await closePool();
  setStore(null);
  process.stdout.write('Seed complete.\n');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

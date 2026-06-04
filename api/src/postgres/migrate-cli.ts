import { getPool, applyMigrations, closePool } from './client';

async function main(): Promise<void> {
  const pool = getPool();
  await applyMigrations(pool);
  await closePool();
  process.stdout.write('Migrations applied.\n');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

/**
 * Whether to insert demo slots (slot-001 … slot-005) on store init.
 * Production Vercel skips seeds; local/preview/Express seed unless overridden.
 */
export function shouldSeedDemoSlots(): boolean {
  const explicit = process.env['SEED_DEMO_SLOTS'];
  if (explicit === 'true') {
    return true;
  }
  if (explicit === 'false') {
    return false;
  }
  if (process.env['VERCEL_ENV'] === 'production') {
    return false;
  }
  return true;
}

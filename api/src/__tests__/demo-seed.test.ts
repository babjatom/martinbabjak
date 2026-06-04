import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shouldSeedDemoSlots } from '../runtime/demo-seed';

describe('shouldSeedDemoSlots', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env['SEED_DEMO_SLOTS'];
    delete process.env['VERCEL_ENV'];
  });

  afterEach(() => {
    process.env = env;
  });

  it('skips seeds on Vercel production', () => {
    process.env['VERCEL_ENV'] = 'production';
    expect(shouldSeedDemoSlots()).toBe(false);
  });

  it('seeds on preview when VERCEL_ENV is preview', () => {
    process.env['VERCEL_ENV'] = 'preview';
    expect(shouldSeedDemoSlots()).toBe(true);
  });

  it('respects SEED_DEMO_SLOTS=true override', () => {
    process.env['VERCEL_ENV'] = 'production';
    process.env['SEED_DEMO_SLOTS'] = 'true';
    expect(shouldSeedDemoSlots()).toBe(true);
  });

  it('respects SEED_DEMO_SLOTS=false override', () => {
    process.env['SEED_DEMO_SLOTS'] = 'false';
    expect(shouldSeedDemoSlots()).toBe(false);
  });
});

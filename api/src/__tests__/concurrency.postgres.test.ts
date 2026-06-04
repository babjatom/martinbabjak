import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { getPool, applyMigrations, closePool } from '../postgres/client';
import { PostgresStore } from '../postgres/PostgresStore';
import { setStore } from '../store';
import { seedSlotsAsync } from '../slots';

const databaseUrl = process.env['DATABASE_URL'];

/**
 * Postgres concurrency gate (addition only). Same expectations as concurrency.test.ts:
 * parallel POST /api/bookings for one slot → one 201 and one 409.
 */

describe.skipIf(!databaseUrl)('Concurrency gate (Postgres)', () => {
  const app = createApp();

  beforeAll(async () => {
    const pool = getPool();
    await applyMigrations(pool);
  });

  beforeEach(async () => {
    const pool = getPool();
    await pool.query('TRUNCATE bookings, slots RESTART IDENTITY CASCADE');
    setStore(new PostgresStore(pool));
    await seedSlotsAsync();
  });

  afterAll(async () => {
    setStore(null);
    await closePool();
  });

  it('allows exactly one booking when two requests race for the same slot', async () => {
    const [res1, res2] = await Promise.all([
      request(app).post('/api/bookings').send({
        slot_id: 'slot-001',
        user_id: 'user-a',
        idempotency_key: 'race-pg-a',
      }),
      request(app).post('/api/bookings').send({
        slot_id: 'slot-001',
        user_id: 'user-b',
        idempotency_key: 'race-pg-b',
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});

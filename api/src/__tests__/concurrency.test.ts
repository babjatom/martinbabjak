import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { setDb, createInMemoryDb, closeDb } from '../db';
import { seedSlots } from '../slots';

/**
 * THE CONCURRENCY GATE
 *
 * Fires two simultaneous POST /api/bookings requests for the same slot via
 * Promise.all and asserts exactly one 201 and one 409.
 *
 * Why Promise.all and not sequential: sequential calls would never overlap
 * in the SQLite transaction window. Promise.all submits both requests to
 * the event loop simultaneously, so both HTTP handlers begin before either
 * completes, exercising the BEGIN IMMEDIATE serialization point.
 *
 * Why better-sqlite3 (synchronous) and not an async driver: the synchronous
 * API makes the transaction boundary the only serialization point, giving
 * deterministic behavior. Async drivers can serialize at the thread-pool
 * level before reaching SQLite, obscuring where correctness comes from.
 *
 * DO NOT remove or skip any test in this file. See CLAUDE.md.
 */

const app = createApp();

beforeEach(() => {
  setDb(createInMemoryDb());
  seedSlots();
});

afterAll(() => {
  closeDb();
});

describe('Concurrency gate: slot double-booking prevention', () => {
  it('allows exactly one booking when two requests race for the same slot', async () => {
    const [res1, res2] = await Promise.all([
      request(app).post('/api/bookings').send({
        slot_id: 'slot-001',
        user_id: 'user-1',
        idempotency_key: 'idem-race-1',
      }),
      request(app).post('/api/bookings').send({
        slot_id: 'slot-001',
        user_id: 'user-2',
        idempotency_key: 'idem-race-2',
      }),
    ]);

    // Sort so the assertion is order-independent — Promise.all does not
    // guarantee which request wins the race.
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const winner = res1.status === 201 ? res1 : res2;
    expect(winner.body.booking.status).toBe('active');
    expect(winner.body.booking.slot_id).toBe('slot-001');

    const loser = res1.status === 409 ? res1 : res2;
    expect(loser.body.error).toBe('SLOT_ALREADY_BOOKED');

    // Verify slot-001 is no longer in the available list
    const slotsRes = await request(app).get('/api/slots');
    const available = (slotsRes.body.slots as Array<{ id: string }>).map((s) => s.id);
    expect(available).not.toContain('slot-001');
  });

  it('allows two bookings for different slots to both succeed simultaneously', async () => {
    const [res1, res2] = await Promise.all([
      request(app).post('/api/bookings').send({
        slot_id: 'slot-001',
        user_id: 'user-1',
        idempotency_key: 'idem-slot1',
      }),
      request(app).post('/api/bookings').send({
        slot_id: 'slot-002',
        user_id: 'user-2',
        idempotency_key: 'idem-slot2',
      }),
    ]);

    // Locking is slot-scoped, not global — both must succeed
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });
});

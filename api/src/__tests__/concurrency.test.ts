import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { hasPostgres, usePostgresTestStore } from './helpers/postgres';

/**
 * THE CONCURRENCY GATE
 *
 * Fires two simultaneous POST /api/bookings requests for the same slot via
 * Promise.all and asserts exactly one 201 and one 409.
 *
 * Postgres: partial unique index on active bookings per slot; one insert wins,
 * the other gets 23505 → SLOT_ALREADY_BOOKED.
 *
 * DO NOT remove or skip any test in this file. See CLAUDE.md.
 */

describe.skipIf(!hasPostgres)('Concurrency gate: slot double-booking prevention', () => {
  const app = createApp();
  usePostgresTestStore();

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

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const winner = res1.status === 201 ? res1 : res2;
    expect(winner.body.booking.status).toBe('active');
    expect(winner.body.booking.slot_id).toBe('slot-001');

    const loser = res1.status === 409 ? res1 : res2;
    expect(loser.body.error).toBe('SLOT_ALREADY_BOOKED');

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

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });
});

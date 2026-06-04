import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { hasPostgres, usePostgresTestStore } from './helpers/postgres';

const app = createApp();

describe.skipIf(!hasPostgres)('GET /api/slots', () => {
  usePostgresTestStore();

  it('returns all available slots', async () => {
    const res = await request(app).get('/api/slots');
    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(5);
  });

  it('excludes slots with active bookings', async () => {
    await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const res = await request(app).get('/api/slots');
    expect(res.body.slots).toHaveLength(4);
    const ids = (res.body.slots as Array<{ id: string }>).map((s) => s.id);
    expect(ids).not.toContain('slot-001');
  });

  it('makes a cancelled slot available again', async () => {
    const bookRes = await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const id = (bookRes.body.booking as { id: string }).id;
    await request(app).delete(`/api/bookings/${id}`);
    const res = await request(app).get('/api/slots');
    const ids = (res.body.slots as Array<{ id: string }>).map((s) => s.id);
    expect(ids).toContain('slot-001');
  });
});

describe.skipIf(!hasPostgres)('POST /api/slots', () => {
  usePostgresTestStore();

  it('creates a slot with ISO datetime and duration', async () => {
    const res = await request(app).post('/api/slots').send({
      label: 'fri',
      starts_at: '2026-06-13T09:59:00.000Z',
      duration_m: 45,
    });
    expect(res.status).toBe(201);
    expect(res.body.slot).toMatchObject({
      label: 'fri',
      starts_at: '2026-06-13T09:59:00.000Z',
      duration_m: 45,
      is_active: 1,
    });
  });
});

describe.skipIf(!hasPostgres)('POST /api/bookings', () => {
  usePostgresTestStore();

  it('creates a booking and returns 201', async () => {
    const res = await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    expect(res.status).toBe(201);
    expect(res.body.booking.slot_id).toBe('slot-001');
    expect(res.body.booking.status).toBe('active');
  });

  it('returns 200 (not 201) for a duplicate idempotency key', async () => {
    const payload = { slot_id: 'slot-001', user_id: 'user-1', idempotency_key: 'idem-1' };
    await request(app).post('/api/bookings').send(payload);
    const res = await request(app).post('/api/bookings').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.booking.slot_id).toBe('slot-001');
  });

  it('returns 409 when slot is already booked', async () => {
    await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const res = await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-2',
      idempotency_key: 'idem-2',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SLOT_ALREADY_BOOKED');
  });

  it('returns 404 for unknown slot', async () => {
    const res = await request(app).post('/api/bookings').send({
      slot_id: 'slot-999',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('SLOT_NOT_FOUND');
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app).post('/api/bookings').send({ slot_id: 'slot-001' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe.skipIf(!hasPostgres)('GET /api/bookings/:id', () => {
  usePostgresTestStore();

  it('returns a booking by id', async () => {
    const createRes = await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const { id } = createRes.body.booking as { id: string };
    const res = await request(app).get(`/api/bookings/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.id).toBe(id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/bookings/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('BOOKING_NOT_FOUND');
  });
});

describe.skipIf(!hasPostgres)('DELETE /api/bookings/:id', () => {
  usePostgresTestStore();

  it('cancels a booking', async () => {
    const createRes = await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const { id } = createRes.body.booking as { id: string };
    const res = await request(app).delete(`/api/bookings/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
    expect(res.body.booking.cancelled_at).not.toBeNull();
  });

  it('returns 409 for an already-cancelled booking', async () => {
    const createRes = await request(app).post('/api/bookings').send({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const { id } = createRes.body.booking as { id: string };
    await request(app).delete(`/api/bookings/${id}`);
    const res = await request(app).delete(`/api/bookings/${id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('BOOKING_ALREADY_CANCELLED');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/bookings/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe.skipIf(!hasPostgres)('GET /api/config + PUT /api/config', () => {
  usePostgresTestStore();

  it('returns default config', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.config.title).toBe('Book a Session');
  });

  it('updates config and returns new values', async () => {
    const res = await request(app)
      .put('/api/config')
      .send({ title: 'My Booking Page', description: 'Custom description' });
    expect(res.status).toBe(200);
    expect(res.body.config.title).toBe('My Booking Page');
    expect(res.body.config.description).toBe('Custom description');
  });
});

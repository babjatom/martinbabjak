import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { setDb, createInMemoryDb, closeDb } from '../db';
import { seedSlots } from '../slots';

const app = createApp();

beforeEach(() => {
  setDb(createInMemoryDb());
  seedSlots();
});

afterAll(() => {
  closeDb();
});

describe('GET /api/slots', () => {
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

describe('POST /api/bookings', () => {
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

describe('GET /api/bookings/:id', () => {
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

describe('DELETE /api/bookings/:id', () => {
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

describe('GET /api/config + PUT /api/config', () => {
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

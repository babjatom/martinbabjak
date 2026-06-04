import { describe, it, expect } from 'vitest';
import { createBooking, cancelBooking, SlotAlreadyBookedError } from '../bookings';
import { hasPostgres, usePostgresTestStore } from './helpers/postgres';

describe.skipIf(!hasPostgres)('PostgresStore', () => {
  usePostgresTestStore();

  it('creates and retrieves a booking', async () => {
    const { booking, created } = await createBooking({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'pg-idem-1',
    });
    expect(created).toBe(true);
    expect(booking.status).toBe('active');
  });

  it('enforces one active booking per slot', async () => {
    await createBooking({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'pg-idem-2',
    });
    await expect(
      createBooking({
        slot_id: 'slot-001',
        user_id: 'user-2',
        idempotency_key: 'pg-idem-3',
      })
    ).rejects.toThrow(SlotAlreadyBookedError);
  });

  it('allows rebooking after cancel', async () => {
    const { booking } = await createBooking({
      slot_id: 'slot-002',
      user_id: 'user-1',
      idempotency_key: 'pg-idem-4',
    });
    await cancelBooking(booking.id);
    const rebook = await createBooking({
      slot_id: 'slot-002',
      user_id: 'user-2',
      idempotency_key: 'pg-idem-5',
    });
    expect(rebook.created).toBe(true);
  });
});

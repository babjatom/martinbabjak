import { describe, it, expect, beforeEach } from 'vitest';
import { setDb, createInMemoryDb } from '../db';
import { seedSlots } from '../slots';
import {
  createBooking,
  getBooking,
  cancelBooking,
  SlotAlreadyBookedError,
  SlotNotFoundError,
  BookingNotFoundError,
  BookingAlreadyCancelledError,
} from '../bookings';

beforeEach(() => {
  setDb(createInMemoryDb());
  seedSlots();
});

describe('createBooking', () => {
  it('creates a booking for a valid slot', () => {
    const { booking, created } = createBooking({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    expect(created).toBe(true);
    expect(booking.slot_id).toBe('slot-001');
    expect(booking.status).toBe('active');
    expect(booking.cancelled_at).toBeNull();
  });

  it('returns the existing booking for a repeated idempotency key', () => {
    const params = { slot_id: 'slot-001', user_id: 'user-1', idempotency_key: 'idem-1' };
    const first = createBooking(params);
    const second = createBooking(params);
    expect(second.created).toBe(false);
    expect(second.booking.id).toBe(first.booking.id);
  });

  it('throws SlotAlreadyBookedError when slot is taken by another user', () => {
    createBooking({ slot_id: 'slot-001', user_id: 'user-1', idempotency_key: 'idem-1' });
    expect(() =>
      createBooking({ slot_id: 'slot-001', user_id: 'user-2', idempotency_key: 'idem-2' })
    ).toThrow(SlotAlreadyBookedError);
  });

  it('allows re-booking a slot after its booking is cancelled', () => {
    const { booking } = createBooking({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    cancelBooking(booking.id);
    const { created } = createBooking({
      slot_id: 'slot-001',
      user_id: 'user-2',
      idempotency_key: 'idem-2',
    });
    expect(created).toBe(true);
  });

  it('allows booking different slots simultaneously', () => {
    const r1 = createBooking({ slot_id: 'slot-001', user_id: 'u1', idempotency_key: 'ik-1' });
    const r2 = createBooking({ slot_id: 'slot-002', user_id: 'u2', idempotency_key: 'ik-2' });
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(true);
  });

  it('throws SlotNotFoundError for non-existent slot', () => {
    expect(() =>
      createBooking({ slot_id: 'slot-999', user_id: 'user-1', idempotency_key: 'idem-1' })
    ).toThrow(SlotNotFoundError);
  });
});

describe('getBooking', () => {
  it('returns the booking by id', () => {
    const { booking } = createBooking({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const fetched = getBooking(booking.id);
    expect(fetched.id).toBe(booking.id);
    expect(fetched.user_id).toBe('user-1');
  });

  it('throws BookingNotFoundError for unknown id', () => {
    expect(() => getBooking('nonexistent')).toThrow(BookingNotFoundError);
  });
});

describe('cancelBooking', () => {
  it('cancels an active booking and sets cancelled_at', () => {
    const { booking } = createBooking({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    const cancelled = cancelBooking(booking.id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelled_at).not.toBeNull();
  });

  it('throws BookingAlreadyCancelledError when cancelled twice', () => {
    const { booking } = createBooking({
      slot_id: 'slot-001',
      user_id: 'user-1',
      idempotency_key: 'idem-1',
    });
    cancelBooking(booking.id);
    expect(() => cancelBooking(booking.id)).toThrow(BookingAlreadyCancelledError);
  });

  it('throws BookingNotFoundError for unknown id', () => {
    expect(() => cancelBooking('nonexistent')).toThrow(BookingNotFoundError);
  });
});

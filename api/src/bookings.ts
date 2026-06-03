import { randomUUID } from 'crypto';
import { getDb } from './db';
import { slotExistsAndActive, SlotNotFoundError } from './slots';

export { SlotNotFoundError };

export interface Booking {
  id: string;
  slot_id: string;
  user_id: string;
  idempotency_key: string;
  status: 'active' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
}

export class SlotAlreadyBookedError extends Error {
  constructor(slotId: string) {
    super(`Slot ${slotId} is already booked`);
    this.name = 'SlotAlreadyBookedError';
  }
}

export class BookingNotFoundError extends Error {
  constructor(id: string) {
    super(`Booking ${id} not found`);
    this.name = 'BookingNotFoundError';
  }
}

export class BookingAlreadyCancelledError extends Error {
  constructor(id: string) {
    super(`Booking ${id} is already cancelled`);
    this.name = 'BookingAlreadyCancelledError';
  }
}

export function createBooking(params: {
  slot_id: string;
  user_id: string;
  idempotency_key: string;
}): { booking: Booking; created: boolean } {
  const db = getDb();

  if (!slotExistsAndActive(params.slot_id)) {
    throw new SlotNotFoundError(params.slot_id);
  }

  // Fast path: check idempotency before acquiring write lock
  const existing = db.prepare<[string], Booking>(
    'SELECT * FROM bookings WHERE idempotency_key = ?'
  ).get(params.idempotency_key);
  if (existing) return { booking: existing, created: false };

  // BEGIN IMMEDIATE acquires the write lock at transaction start.
  // Two concurrent requests for the same slot will serialize here:
  // the second caller blocks until the first commits, then sees
  // the committed booking and throws SlotAlreadyBookedError.
  const bookSlot = db.transaction((): Booking => {
    // Re-check idempotency inside the transaction to close the TOCTOU gap
    const idempotentMatch = db.prepare<[string], Booking>(
      'SELECT * FROM bookings WHERE idempotency_key = ?'
    ).get(params.idempotency_key);
    if (idempotentMatch) return idempotentMatch;

    const activeBooking = db.prepare<[string], { id: string }>(
      "SELECT id FROM bookings WHERE slot_id = ? AND status = 'active'"
    ).get(params.slot_id);
    if (activeBooking) throw new SlotAlreadyBookedError(params.slot_id);

    const newBooking: Booking = {
      id: randomUUID(),
      slot_id: params.slot_id,
      user_id: params.user_id,
      idempotency_key: params.idempotency_key,
      status: 'active',
      created_at: new Date().toISOString(),
      cancelled_at: null,
    };

    db.prepare(`
      INSERT INTO bookings (id, slot_id, user_id, idempotency_key, status, created_at, cancelled_at)
      VALUES (@id, @slot_id, @user_id, @idempotency_key, @status, @created_at, @cancelled_at)
    `).run(newBooking);

    return newBooking;
  });

  const booking = bookSlot.immediate();
  return { booking, created: true };
}

export function getBooking(id: string): Booking {
  const db = getDb();
  const booking = db.prepare<[string], Booking>(
    'SELECT * FROM bookings WHERE id = ?'
  ).get(id);
  if (!booking) throw new BookingNotFoundError(id);
  return booking;
}

export function cancelBooking(id: string): Booking {
  const db = getDb();

  const cancel = db.transaction((): Booking => {
    const booking = db.prepare<[string], Booking>(
      'SELECT * FROM bookings WHERE id = ?'
    ).get(id);
    if (!booking) throw new BookingNotFoundError(id);
    if (booking.status === 'cancelled') throw new BookingAlreadyCancelledError(id);

    const cancelledAt = new Date().toISOString();
    db.prepare(
      "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?"
    ).run(cancelledAt, id);

    return { ...booking, status: 'cancelled', cancelled_at: cancelledAt };
  });

  return cancel();
}

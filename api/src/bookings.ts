import { randomUUID } from 'crypto';
import { getStore } from './store';
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
  const store = getStore();

  if (!slotExistsAndActive(params.slot_id)) {
    throw new SlotNotFoundError(params.slot_id);
  }

  // Fast path: check idempotency before acquiring the write lock
  const existing = store.findBookingByIdempotencyKey(params.idempotency_key);
  if (existing) return { booking: existing, created: false };

  // store.transaction runs atomically. For SQLite it uses BEGIN IMMEDIATE,
  // acquiring the write lock at transaction start: two concurrent requests for
  // the same slot serialize here — the second blocks until the first commits,
  // then sees the committed booking and throws SlotAlreadyBookedError.
  const booking = store.transaction((): Booking => {
    // Re-check idempotency inside the transaction to close the TOCTOU gap
    const idempotentMatch = store.findBookingByIdempotencyKey(params.idempotency_key);
    if (idempotentMatch) return idempotentMatch;

    const activeBooking = store.findActiveBookingIdBySlot(params.slot_id);
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

    store.insertBooking(newBooking);
    return newBooking;
  });

  return { booking, created: true };
}

export function getBooking(id: string): Booking {
  const booking = getStore().getBookingById(id);
  if (!booking) throw new BookingNotFoundError(id);
  return booking;
}

export function cancelBooking(id: string): Booking {
  const store = getStore();

  return store.transaction((): Booking => {
    const booking = store.getBookingById(id);
    if (!booking) throw new BookingNotFoundError(id);
    if (booking.status === 'cancelled') throw new BookingAlreadyCancelledError(id);

    const cancelledAt = new Date().toISOString();
    store.setBookingCancelled(id, cancelledAt);

    return { ...booking, status: 'cancelled', cancelled_at: cancelledAt };
  });
}

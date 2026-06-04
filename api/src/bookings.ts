import { randomUUID } from 'crypto';
import { getStore } from './store-registry';
import { SlotNotFoundError } from './slots';
import { isPostgresStore, PostgresStore } from './postgres/PostgresStore';

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

export async function createBooking(params: {
  slot_id: string;
  user_id: string;
  idempotency_key: string;
}): Promise<{ booking: Booking; created: boolean }> {
  const store = getStore();
  if (!isPostgresStore(store)) {
    throw new Error('PostgresStore required');
  }
  return createBookingPostgres(store, params);
}

async function createBookingPostgres(
  store: PostgresStore,
  params: { slot_id: string; user_id: string; idempotency_key: string }
): Promise<{ booking: Booking; created: boolean }> {
  if (!(await store.slotExistsAndActiveAsync(params.slot_id))) {
    throw new SlotNotFoundError(params.slot_id);
  }

  const existing = await store.findBookingByIdempotencyKeyAsync(params.idempotency_key);
  if (existing) return { booking: existing, created: false };

  const booking = await store.transactionAsync(async (): Promise<Booking> => {
    const idempotentMatch = await store.findBookingByIdempotencyKeyAsync(params.idempotency_key);
    if (idempotentMatch) return idempotentMatch;

    const activeBooking = await store.findActiveBookingIdBySlotAsync(params.slot_id);
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

    await store.insertBookingAsync(newBooking);
    return newBooking;
  });

  return { booking, created: true };
}

export async function getBooking(id: string): Promise<Booking> {
  const store = getStore();
  if (!isPostgresStore(store)) {
    throw new Error('PostgresStore required');
  }
  const booking = await store.getBookingByIdAsync(id);
  if (!booking) throw new BookingNotFoundError(id);
  return booking;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const store = getStore();
  if (!isPostgresStore(store)) {
    throw new Error('PostgresStore required');
  }
  return store.transactionAsync(async (): Promise<Booking> => {
    const booking = await store.getBookingByIdAsync(id);
    if (!booking) throw new BookingNotFoundError(id);
    if (booking.status === 'cancelled') throw new BookingAlreadyCancelledError(id);

    const cancelledAt = new Date().toISOString();
    await store.setBookingCancelledAsync(id, cancelledAt);

    return { ...booking, status: 'cancelled', cancelled_at: cancelledAt };
  });
}

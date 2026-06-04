import type { Booking } from './bookings';
import type { Slot } from './slots';

/** A slot row before it gains its `is_active` flag (seed shape). */
export type SeedSlot = Omit<Slot, 'is_active'>;

/**
 * Store — the database interface seam (Phase 1 of the Vercel hosting migration).
 *
 * Domain modules depend on this interface only. Production uses {@link PostgresStore}.
 */
export interface Store {
  transaction<T>(fn: () => T): T;
  transactionAsync?<T>(fn: () => Promise<T>): Promise<T>;

  getConfigRows(): { key: string; value: string }[];
  setConfigValue(key: string, value: string): void;

  seedSlots(slots: SeedSlot[]): void;
  listAvailableSlots(): Slot[];
  listAllSlots(): Slot[];
  slotExistsAndActive(slotId: string): boolean;
  insertSlot(slot: Slot): void;
  deactivateSlot(id: string): number;

  findBookingByIdempotencyKey(key: string): Booking | undefined;
  findActiveBookingIdBySlot(slotId: string): { id: string } | undefined;
  insertBooking(booking: Booking): void;
  getBookingById(id: string): Booking | undefined;
  setBookingCancelled(id: string, cancelledAt: string): void;
}

let _store: Store | null = null;

/** Returns the active store. Throws if {@link setStore} was not called (e.g. before route init). */
export function getStore(): Store {
  if (_store === null) {
    throw new Error('Store not initialized; call setStore() before using the API');
  }
  return _store;
}

/** Set the active store. Pass `null` to clear between tests. */
export function setStore(store: Store | null): void {
  _store = store;
}

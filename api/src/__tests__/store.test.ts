import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStore, setStore, type Store, type SeedSlot } from '../store';
import { setDb, createInMemoryDb } from '../db';
import {
  createBooking,
  getBooking,
  cancelBooking,
  SlotAlreadyBookedError,
  SlotNotFoundError,
  BookingNotFoundError,
  BookingAlreadyCancelledError,
  type Booking,
} from '../bookings';
import { seedSlots, listAvailableSlots, createSlot, deactivateSlot, type Slot } from '../slots';
import { getConfig, updateConfig } from '../config';

/**
 * Phase 1 (Vercel hosting migration): the domain modules depend only on the
 * Store interface, never on a concrete driver. This file proves the seam two
 * ways:
 *   1. The default Store is SQLite-backed and follows the active connection.
 *   2. The whole domain runs against a non-SQLite Store (a stand-in for the
 *      Phase 2 Postgres adapter), enforcing the booking invariant.
 *
 * Real concurrent-race coverage stays in concurrency.test.ts against SQLite's
 * BEGIN IMMEDIATE. This file exercises the *sequential* invariant.
 */

describe('Store seam: default SQLite store', () => {
  beforeEach(() => {
    setStore(null); // ensure the default SQLite-backed store
    setDb(createInMemoryDb());
    seedSlots();
  });

  afterEach(() => {
    setStore(null);
  });

  it('getStore() returns a Store backed by the active SQLite connection', () => {
    const store = getStore();
    expect(typeof store.transaction).toBe('function');
    expect(store.slotExistsAndActive('slot-001')).toBe(true);
    expect(store.listAllSlots()).toHaveLength(5);
  });
});

/**
 * An in-memory fake implementing the Store interface with no SQLite at all.
 * If the domain works against this, it is genuinely behind the interface.
 */
class InMemoryStore implements Store {
  private config = new Map<string, string>([
    ['title', 'Book a Session'],
    ['description', 'Pick a time slot that works for you.'],
    ['bg_image_url', ''],
  ]);
  private slots = new Map<string, Slot>();
  private bookings = new Map<string, Booking>();

  transaction<T>(fn: () => T): T {
    return fn();
  }

  getConfigRows(): { key: string; value: string }[] {
    return [...this.config.entries()].map(([key, value]) => ({ key, value }));
  }

  setConfigValue(key: string, value: string): void {
    this.config.set(key, value);
  }

  seedSlots(slots: SeedSlot[]): void {
    for (const s of slots) {
      if (!this.slots.has(s.id)) this.slots.set(s.id, { ...s, is_active: 1 });
    }
  }

  listAvailableSlots(): Slot[] {
    return [...this.slots.values()]
      .filter(
        (s) =>
          s.is_active === 1 &&
          ![...this.bookings.values()].some(
            (b) => b.slot_id === s.id && b.status === 'active'
          )
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  listAllSlots(): Slot[] {
    return [...this.slots.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  slotExistsAndActive(slotId: string): boolean {
    return this.slots.get(slotId)?.is_active === 1;
  }

  insertSlot(slot: Slot): void {
    this.slots.set(slot.id, slot);
  }

  deactivateSlot(id: string): number {
    const slot = this.slots.get(id);
    if (!slot || slot.is_active !== 1) return 0;
    this.slots.set(id, { ...slot, is_active: 0 });
    return 1;
  }

  findBookingByIdempotencyKey(key: string): Booking | undefined {
    return [...this.bookings.values()].find((b) => b.idempotency_key === key);
  }

  findActiveBookingIdBySlot(slotId: string): { id: string } | undefined {
    const found = [...this.bookings.values()].find(
      (b) => b.slot_id === slotId && b.status === 'active'
    );
    return found ? { id: found.id } : undefined;
  }

  insertBooking(booking: Booking): void {
    this.bookings.set(booking.id, booking);
  }

  getBookingById(id: string): Booking | undefined {
    return this.bookings.get(id);
  }

  setBookingCancelled(id: string, cancelledAt: string): void {
    const b = this.bookings.get(id);
    if (b) this.bookings.set(id, { ...b, status: 'cancelled', cancelled_at: cancelledAt });
  }
}

describe('Store seam: domain works against a non-SQLite Store', () => {
  beforeEach(() => {
    setStore(new InMemoryStore());
    seedSlots();
  });

  afterEach(() => {
    setStore(null);
  });

  it('creates a booking through the injected store', () => {
    const { booking, created } = createBooking({
      slot_id: 'slot-001',
      user_id: 'u1',
      idempotency_key: 'k1',
    });
    expect(created).toBe(true);
    expect(booking.slot_id).toBe('slot-001');
    expect(booking.status).toBe('active');
    expect(booking.cancelled_at).toBeNull();
  });

  it('is idempotent for a repeated key', () => {
    const p = { slot_id: 'slot-001', user_id: 'u1', idempotency_key: 'k1' };
    const a = createBooking(p);
    const b = createBooking(p);
    expect(b.created).toBe(false);
    expect(b.booking.id).toBe(a.booking.id);
  });

  it('enforces the invariant: a second active booking for the slot throws', () => {
    createBooking({ slot_id: 'slot-001', user_id: 'u1', idempotency_key: 'k1' });
    expect(() =>
      createBooking({ slot_id: 'slot-001', user_id: 'u2', idempotency_key: 'k2' })
    ).toThrow(SlotAlreadyBookedError);
  });

  it('throws SlotNotFoundError for an unknown slot', () => {
    expect(() =>
      createBooking({ slot_id: 'nope', user_id: 'u1', idempotency_key: 'k1' })
    ).toThrow(SlotNotFoundError);
  });

  it('cancels and frees the slot for rebooking', () => {
    const { booking } = createBooking({
      slot_id: 'slot-001',
      user_id: 'u1',
      idempotency_key: 'k1',
    });
    const cancelled = cancelBooking(booking.id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelled_at).not.toBeNull();
    expect(listAvailableSlots().map((s) => s.id)).toContain('slot-001');
    const rebook = createBooking({ slot_id: 'slot-001', user_id: 'u2', idempotency_key: 'k2' });
    expect(rebook.created).toBe(true);
  });

  it('surfaces not-found and already-cancelled errors', () => {
    expect(() => getBooking('missing')).toThrow(BookingNotFoundError);
    expect(() => cancelBooking('missing')).toThrow(BookingNotFoundError);
    const { booking } = createBooking({
      slot_id: 'slot-002',
      user_id: 'u1',
      idempotency_key: 'k3',
    });
    cancelBooking(booking.id);
    expect(() => cancelBooking(booking.id)).toThrow(BookingAlreadyCancelledError);
  });

  it('reads and updates config through the store', () => {
    expect(getConfig().title).toBe('Book a Session');
    const updated = updateConfig({ title: 'Custom' });
    expect(updated.title).toBe('Custom');
  });

  it('creates and deactivates slots through the store', () => {
    const slot = createSlot({ label: 'New', starts_at: '2026-07-08T09:00:00Z' });
    expect(listAvailableSlots().map((s) => s.id)).toContain(slot.id);
    deactivateSlot(slot.id);
    expect(listAvailableSlots().map((s) => s.id)).not.toContain(slot.id);
  });
});

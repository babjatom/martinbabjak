import { getDb } from './db';
import type { Booking } from './bookings';
import type { Slot } from './slots';

/** A slot row before it gains its `is_active` flag (seed shape). */
export type SeedSlot = Omit<Slot, 'is_active'>;

/**
 * Store — the database interface seam (Phase 1 of the Vercel hosting migration).
 *
 * The domain modules (`bookings`, `slots`, `config`) depend ONLY on this
 * interface, never on a concrete driver. The `api` package keeps SQLite via
 * `SqliteStore`; Phase 2 adds a Postgres adapter implementing this same
 * interface (partial unique index + unique-violation → 409).
 *
 * The booking invariant — exactly one active booking per slot — is enforced by
 * the SQLite implementation of `transaction`, which uses better-sqlite3
 * `BEGIN IMMEDIATE`. Two concurrent writers serialize at that boundary.
 */
export interface Store {
  /**
   * Run `fn` atomically. SQLite acquires the write lock at transaction start
   * (BEGIN IMMEDIATE), serializing concurrent writers — the invariant's
   * enforcement point. `fn` must be synchronous.
   */
  transaction<T>(fn: () => T): T;

  // --- config ---
  getConfigRows(): { key: string; value: string }[];
  setConfigValue(key: string, value: string): void;

  // --- slots ---
  seedSlots(slots: SeedSlot[]): void;
  listAvailableSlots(): Slot[];
  listAllSlots(): Slot[];
  slotExistsAndActive(slotId: string): boolean;
  insertSlot(slot: Slot): void;
  /** Returns the number of rows changed (0 when the slot was missing/inactive). */
  deactivateSlot(id: string): number;

  // --- bookings ---
  findBookingByIdempotencyKey(key: string): Booking | undefined;
  findActiveBookingIdBySlot(slotId: string): { id: string } | undefined;
  insertBooking(booking: Booking): void;
  getBookingById(id: string): Booking | undefined;
  setBookingCancelled(id: string, cancelledAt: string): void;
}

/**
 * SQLite implementation of {@link Store}. Reads the active connection from
 * `getDb()` on every call, so swapping the connection via `setDb()` (used by
 * tests) is transparent to the domain layer.
 */
export class SqliteStore implements Store {
  transaction<T>(fn: () => T): T {
    // BEGIN IMMEDIATE acquires the write lock at transaction start. Two
    // concurrent requests for the same slot serialize here: the second blocks
    // until the first commits, then sees the committed booking and throws
    // SlotAlreadyBookedError. Do NOT change to .deferred() — see CLAUDE.md.
    const tx = getDb().transaction(fn);
    return tx.immediate();
  }

  getConfigRows(): { key: string; value: string }[] {
    return getDb()
      .prepare<[], { key: string; value: string }>('SELECT key, value FROM page_config')
      .all();
  }

  setConfigValue(key: string, value: string): void {
    getDb().prepare('UPDATE page_config SET value = ? WHERE key = ?').run(value, key);
  }

  seedSlots(slots: SeedSlot[]): void {
    const db = getDb();
    const insert = db.prepare<[string, string, string, number]>(
      'INSERT OR IGNORE INTO slots (id, label, starts_at, duration_m) VALUES (?, ?, ?, ?)'
    );
    const insertMany = db.transaction(() => {
      for (const slot of slots) {
        insert.run(slot.id, slot.label, slot.starts_at, slot.duration_m);
      }
    });
    insertMany();
  }

  listAvailableSlots(): Slot[] {
    return getDb()
      .prepare<[], Slot>(
        `
        SELECT s.*
        FROM slots s
        WHERE s.is_active = 1
          AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.slot_id = s.id AND b.status = 'active'
          )
        ORDER BY s.starts_at
      `
      )
      .all();
  }

  listAllSlots(): Slot[] {
    return getDb().prepare<[], Slot>('SELECT * FROM slots ORDER BY starts_at').all();
  }

  slotExistsAndActive(slotId: string): boolean {
    const row = getDb()
      .prepare<[string], { count: number }>(
        'SELECT COUNT(*) as count FROM slots WHERE id = ? AND is_active = 1'
      )
      .get(slotId);
    return (row?.count ?? 0) > 0;
  }

  insertSlot(slot: Slot): void {
    getDb()
      .prepare(
        'INSERT INTO slots (id, label, starts_at, duration_m, is_active) VALUES (?, ?, ?, ?, ?)'
      )
      .run(slot.id, slot.label, slot.starts_at, slot.duration_m, slot.is_active);
  }

  deactivateSlot(id: string): number {
    const result = getDb()
      .prepare('UPDATE slots SET is_active = 0 WHERE id = ? AND is_active = 1')
      .run(id);
    return result.changes;
  }

  findBookingByIdempotencyKey(key: string): Booking | undefined {
    return getDb()
      .prepare<[string], Booking>('SELECT * FROM bookings WHERE idempotency_key = ?')
      .get(key);
  }

  findActiveBookingIdBySlot(slotId: string): { id: string } | undefined {
    return getDb()
      .prepare<[string], { id: string }>(
        "SELECT id FROM bookings WHERE slot_id = ? AND status = 'active'"
      )
      .get(slotId);
  }

  insertBooking(booking: Booking): void {
    getDb()
      .prepare(
        `
        INSERT INTO bookings (id, slot_id, user_id, idempotency_key, status, created_at, cancelled_at)
        VALUES (@id, @slot_id, @user_id, @idempotency_key, @status, @created_at, @cancelled_at)
      `
      )
      .run(booking);
  }

  getBookingById(id: string): Booking | undefined {
    return getDb().prepare<[string], Booking>('SELECT * FROM bookings WHERE id = ?').get(id);
  }

  setBookingCancelled(id: string, cancelledAt: string): void {
    getDb()
      .prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?")
      .run(cancelledAt, id);
  }
}

const defaultStore = new SqliteStore();
let _store: Store | null = null;

/** Returns the active {@link Store} (the SQLite-backed default unless overridden). */
export function getStore(): Store {
  return _store ?? defaultStore;
}

/**
 * Override the active store (testability seam). Pass `null` to restore the
 * default SQLite-backed store.
 */
export function setStore(store: Store | null): void {
  _store = store;
}

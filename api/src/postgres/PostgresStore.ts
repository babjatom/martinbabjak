import type { Pool, PoolClient } from 'pg';
import type { SeedSlot } from '../store-registry';
import type { Booking } from '../bookings';
import type { Slot } from '../slots';
import { SlotAlreadyBookedError } from '../bookings';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === PG_UNIQUE_VIOLATION
  );
}

function rowToSlot(row: {
  id: string;
  label: string;
  starts_at: string;
  duration_m: number;
  is_active: number;
}): Slot {
  return {
    id: row.id,
    label: row.label,
    starts_at: row.starts_at,
    duration_m: row.duration_m,
    is_active: row.is_active,
  };
}

function rowToBooking(row: {
  id: string;
  slot_id: string;
  user_id: string;
  idempotency_key: string;
  status: string;
  created_at: string;
  cancelled_at: string | null;
}): Booking {
  return {
    id: row.id,
    slot_id: row.slot_id,
    user_id: row.user_id,
    idempotency_key: row.idempotency_key,
    status: row.status as Booking['status'],
    created_at: row.created_at,
    cancelled_at: row.cancelled_at,
  };
}

/**
 * Postgres store. Uses a transaction-scoped client during
 * {@link PostgresStore.transactionAsync} so booking invariant checks and
 * inserts share one connection.
 */
export class PostgresStore {
  private txClient: PoolClient | null = null;

  constructor(private readonly pool: Pool) {}

  private client(): Pool | PoolClient {
    return this.txClient ?? this.pool;
  }

  async transactionAsync<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    this.txClient = client;
    try {
      await client.query('BEGIN');
      const result = await fn();
      await client.query('COMMIT');
      return result;
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      this.txClient = null;
      client.release();
    }
  }

  async getConfigRowsAsync(): Promise<{ key: string; value: string }[]> {
    const res = await this.client().query<{ key: string; value: string }>(
      'SELECT key, value FROM page_config'
    );
    return res.rows;
  }

  async setConfigValueAsync(key: string, value: string): Promise<void> {
    await this.client().query('UPDATE page_config SET value = $1 WHERE key = $2', [value, key]);
  }

  async seedSlotsAsync(slots: SeedSlot[]): Promise<void> {
    for (const slot of slots) {
      await this.client().query(
        `INSERT INTO slots (id, label, starts_at, duration_m, is_active)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (id) DO NOTHING`,
        [slot.id, slot.label, slot.starts_at, slot.duration_m]
      );
    }
  }

  async listAvailableSlotsAsync(): Promise<Slot[]> {
    const res = await this.client().query(
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
    );
    return res.rows.map(rowToSlot);
  }

  async listAllSlotsAsync(): Promise<Slot[]> {
    const res = await this.client().query('SELECT * FROM slots ORDER BY starts_at');
    return res.rows.map(rowToSlot);
  }

  async slotExistsAndActiveAsync(slotId: string): Promise<boolean> {
    const res = await this.client().query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM slots WHERE id = $1 AND is_active = 1',
      [slotId]
    );
    const count = res.rows[0]?.count ?? '0';
    return parseInt(count, 10) > 0;
  }

  async insertSlotAsync(slot: Slot): Promise<void> {
    await this.client().query(
      `INSERT INTO slots (id, label, starts_at, duration_m, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [slot.id, slot.label, slot.starts_at, slot.duration_m, slot.is_active]
    );
  }

  async deactivateSlotAsync(id: string): Promise<number> {
    const res = await this.client().query(
      'UPDATE slots SET is_active = 0 WHERE id = $1 AND is_active = 1',
      [id]
    );
    return res.rowCount ?? 0;
  }

  async findBookingByIdempotencyKeyAsync(key: string): Promise<Booking | undefined> {
    const res = await this.client().query(
      'SELECT * FROM bookings WHERE idempotency_key = $1',
      [key]
    );
    const row = res.rows[0];
    return row ? rowToBooking(row) : undefined;
  }

  async findActiveBookingIdBySlotAsync(slotId: string): Promise<{ id: string } | undefined> {
    const res = await this.client().query<{ id: string }>(
      "SELECT id FROM bookings WHERE slot_id = $1 AND status = 'active'",
      [slotId]
    );
    return res.rows[0];
  }

  async listActiveBookingsAsync(): Promise<Booking[]> {
    const res = await this.client().query(
      "SELECT * FROM bookings WHERE status = 'active' ORDER BY created_at DESC"
    );
    return res.rows.map(rowToBooking);
  }

  async insertBookingAsync(booking: Booking): Promise<void> {
    try {
      await this.client().query(
        `
        INSERT INTO bookings (id, slot_id, user_id, idempotency_key, status, created_at, cancelled_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          booking.id,
          booking.slot_id,
          booking.user_id,
          booking.idempotency_key,
          booking.status,
          booking.created_at,
          booking.cancelled_at,
        ]
      );
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new SlotAlreadyBookedError(booking.slot_id);
      }
      throw err;
    }
  }

  async getBookingByIdAsync(id: string): Promise<Booking | undefined> {
    const res = await this.client().query('SELECT * FROM bookings WHERE id = $1', [id]);
    const row = res.rows[0];
    return row ? rowToBooking(row) : undefined;
  }

  async setBookingCancelledAsync(id: string, cancelledAt: string): Promise<void> {
    await this.client().query(
      "UPDATE bookings SET status = 'cancelled', cancelled_at = $1 WHERE id = $2",
      [cancelledAt, id]
    );
  }
}

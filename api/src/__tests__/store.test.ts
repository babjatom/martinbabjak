import { describe, it, expect } from 'vitest';
import {
  createBooking,
  cancelBooking,
  getBooking,
  SlotAlreadyBookedError,
  SlotNotFoundError,
  BookingNotFoundError,
  BookingAlreadyCancelledError,
} from '../bookings';
import { listAvailableSlots, createSlot, deactivateSlot } from '../slots';
import { getConfig, updateConfig } from '../config';
import { hasPostgres, usePostgresTestStore } from './helpers/postgres';

describe.skipIf(!hasPostgres)('Store seam (Postgres)', () => {
  usePostgresTestStore();

  it('creates a booking through the active store', async () => {
    const { booking, created } = await createBooking({
      slot_id: 'slot-001',
      user_id: 'u1',
      idempotency_key: 'k1',
    });
    expect(created).toBe(true);
    expect(booking.slot_id).toBe('slot-001');
    expect(booking.status).toBe('active');
    expect(booking.cancelled_at).toBeNull();
  });

  it('is idempotent for a repeated key', async () => {
    const p = { slot_id: 'slot-001', user_id: 'u1', idempotency_key: 'k1' };
    const a = await createBooking(p);
    const b = await createBooking(p);
    expect(b.created).toBe(false);
    expect(b.booking.id).toBe(a.booking.id);
  });

  it('enforces the invariant: a second active booking for the slot throws', async () => {
    await createBooking({ slot_id: 'slot-001', user_id: 'u1', idempotency_key: 'k1' });
    await expect(
      createBooking({ slot_id: 'slot-001', user_id: 'u2', idempotency_key: 'k2' })
    ).rejects.toThrow(SlotAlreadyBookedError);
  });

  it('throws SlotNotFoundError for an unknown slot', async () => {
    await expect(
      createBooking({ slot_id: 'nope', user_id: 'u1', idempotency_key: 'k1' })
    ).rejects.toThrow(SlotNotFoundError);
  });

  it('cancels and frees the slot for rebooking', async () => {
    const { booking } = await createBooking({
      slot_id: 'slot-001',
      user_id: 'u1',
      idempotency_key: 'k1',
    });
    const cancelled = await cancelBooking(booking.id);
    expect(cancelled.status).toBe('cancelled');
    expect((await listAvailableSlots()).map((s) => s.id)).toContain('slot-001');
    const rebook = await createBooking({ slot_id: 'slot-001', user_id: 'u2', idempotency_key: 'k2' });
    expect(rebook.created).toBe(true);
  });

  it('surfaces not-found and already-cancelled errors', async () => {
    await expect(getBooking('missing')).rejects.toThrow(BookingNotFoundError);
    await expect(cancelBooking('missing')).rejects.toThrow(BookingNotFoundError);
    const { booking } = await createBooking({
      slot_id: 'slot-002',
      user_id: 'u1',
      idempotency_key: 'k3',
    });
    await cancelBooking(booking.id);
    await expect(cancelBooking(booking.id)).rejects.toThrow(BookingAlreadyCancelledError);
  });

  it('reads and updates config through the store', async () => {
    expect((await getConfig()).title).toBe('Book a Session');
    const updated = await updateConfig({ title: 'Custom' });
    expect(updated.title).toBe('Custom');
  });

  it('creates and deactivates slots through the store', async () => {
    const slot = await createSlot({ label: 'New', starts_at: '2026-07-08T09:00:00Z' });
    expect((await listAvailableSlots()).map((s) => s.id)).toContain(slot.id);
    await deactivateSlot(slot.id);
    expect((await listAvailableSlots()).map((s) => s.id)).not.toContain(slot.id);
  });
});

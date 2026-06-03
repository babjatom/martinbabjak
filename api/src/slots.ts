import { randomUUID } from 'crypto';
import { getDb } from './db';

export interface Slot {
  id: string;
  label: string;
  starts_at: string;
  duration_m: number;
  is_active: number;
}

export class SlotNotFoundError extends Error {
  constructor(id: string) {
    super(`Slot ${id} not found or already inactive`);
    this.name = 'SlotNotFoundError';
  }
}

const SEED_SLOTS: Omit<Slot, 'is_active'>[] = [
  { id: 'slot-001', label: 'Monday 09:00', starts_at: '2026-07-06T09:00:00Z', duration_m: 30 },
  { id: 'slot-002', label: 'Monday 09:30', starts_at: '2026-07-06T09:30:00Z', duration_m: 30 },
  { id: 'slot-003', label: 'Monday 10:00', starts_at: '2026-07-06T10:00:00Z', duration_m: 30 },
  { id: 'slot-004', label: 'Tuesday 09:00', starts_at: '2026-07-07T09:00:00Z', duration_m: 30 },
  { id: 'slot-005', label: 'Tuesday 09:30', starts_at: '2026-07-07T09:30:00Z', duration_m: 30 },
];

export function seedSlots(): void {
  const db = getDb();
  const insert = db.prepare<[string, string, string, number]>(
    'INSERT OR IGNORE INTO slots (id, label, starts_at, duration_m) VALUES (?, ?, ?, ?)'
  );
  const insertMany = db.transaction(() => {
    for (const slot of SEED_SLOTS) {
      insert.run(slot.id, slot.label, slot.starts_at, slot.duration_m);
    }
  });
  insertMany();
}

export function listAvailableSlots(): Slot[] {
  const db = getDb();
  return db.prepare<[], Slot>(`
    SELECT s.*
    FROM slots s
    WHERE s.is_active = 1
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.slot_id = s.id AND b.status = 'active'
      )
    ORDER BY s.starts_at
  `).all();
}

export function listAllSlots(): Slot[] {
  const db = getDb();
  return db.prepare<[], Slot>('SELECT * FROM slots ORDER BY starts_at').all();
}

export function slotExistsAndActive(slotId: string): boolean {
  const db = getDb();
  const row = db.prepare<[string], { count: number }>(
    'SELECT COUNT(*) as count FROM slots WHERE id = ? AND is_active = 1'
  ).get(slotId);
  return (row?.count ?? 0) > 0;
}

export function createSlot(params: {
  label: string;
  starts_at: string;
  duration_m?: number;
}): Slot {
  const db = getDb();
  const id = randomUUID();
  const duration_m = params.duration_m ?? 30;
  db.prepare(
    'INSERT INTO slots (id, label, starts_at, duration_m, is_active) VALUES (?, ?, ?, ?, 1)'
  ).run(id, params.label, params.starts_at, duration_m);
  return { id, label: params.label, starts_at: params.starts_at, duration_m, is_active: 1 };
}

export function deactivateSlot(id: string): void {
  const db = getDb();
  const result = db.prepare(
    'UPDATE slots SET is_active = 0 WHERE id = ? AND is_active = 1'
  ).run(id);
  if (result.changes === 0) throw new SlotNotFoundError(id);
}

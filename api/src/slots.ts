import { randomUUID } from 'crypto';
import { getStore } from './store';

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
  getStore().seedSlots(SEED_SLOTS);
}

export function listAvailableSlots(): Slot[] {
  return getStore().listAvailableSlots();
}

export function listAllSlots(): Slot[] {
  return getStore().listAllSlots();
}

export function slotExistsAndActive(slotId: string): boolean {
  return getStore().slotExistsAndActive(slotId);
}

export function createSlot(params: {
  label: string;
  starts_at: string;
  duration_m?: number;
}): Slot {
  const id = randomUUID();
  const duration_m = params.duration_m ?? 30;
  const slot: Slot = {
    id,
    label: params.label,
    starts_at: params.starts_at,
    duration_m,
    is_active: 1,
  };
  getStore().insertSlot(slot);
  return slot;
}

export function deactivateSlot(id: string): void {
  const changes = getStore().deactivateSlot(id);
  if (changes === 0) throw new SlotNotFoundError(id);
}

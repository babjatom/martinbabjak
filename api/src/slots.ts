import { randomUUID } from 'crypto';
import { getStore } from './store';
import { isPostgresStore } from './postgres/PostgresStore';

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
  const store = getStore();
  if (isPostgresStore(store)) {
    void store.seedSlotsAsync(SEED_SLOTS);
    return;
  }
  getStore().seedSlots(SEED_SLOTS);
}

export async function seedSlotsAsync(): Promise<void> {
  const store = getStore();
  if (isPostgresStore(store)) {
    await store.seedSlotsAsync(SEED_SLOTS);
    return;
  }
  getStore().seedSlots(SEED_SLOTS);
}

export async function listAvailableSlots(): Promise<Slot[]> {
  const store = getStore();
  if (isPostgresStore(store)) {
    return store.listAvailableSlotsAsync();
  }
  return store.listAvailableSlots();
}

export async function listAllSlots(): Promise<Slot[]> {
  const store = getStore();
  if (isPostgresStore(store)) {
    return store.listAllSlotsAsync();
  }
  return store.listAllSlots();
}

export async function slotExistsAndActive(slotId: string): Promise<boolean> {
  const store = getStore();
  if (isPostgresStore(store)) {
    return store.slotExistsAndActiveAsync(slotId);
  }
  return store.slotExistsAndActive(slotId);
}

export async function createSlot(params: {
  label: string;
  starts_at: string;
  duration_m?: number;
}): Promise<Slot> {
  const id = randomUUID();
  const duration_m = params.duration_m ?? 30;
  const slot: Slot = {
    id,
    label: params.label,
    starts_at: params.starts_at,
    duration_m,
    is_active: 1,
  };
  const store = getStore();
  if (isPostgresStore(store)) {
    await store.insertSlotAsync(slot);
  } else {
    store.insertSlot(slot);
  }
  return slot;
}

export async function deactivateSlot(id: string): Promise<void> {
  const store = getStore();
  const changes = isPostgresStore(store)
    ? await store.deactivateSlotAsync(id)
    : store.deactivateSlot(id);
  if (changes === 0) throw new SlotNotFoundError(id);
}

import type { Slot } from './slots';
import type { PostgresStore } from './postgres/PostgresStore';

/** A slot row before it gains its `is_active` flag (seed shape). */
export type SeedSlot = Omit<Slot, 'is_active'>;

let _store: PostgresStore | null = null;

/** Returns the active store. Throws if {@link setStore} was not called (e.g. before route init). */
export function getStore(): PostgresStore {
  if (_store === null) {
    throw new Error('Store not initialized; call setStore() before using the API');
  }
  return _store;
}

/** Set the active store. Pass `null` to clear between tests. */
export function setStore(store: PostgresStore | null): void {
  _store = store;
}

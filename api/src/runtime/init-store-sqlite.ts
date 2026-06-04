import { setDb, createInMemoryDb } from '../db';
import { setStore } from '../store';
import { seedSlots } from '../slots';

/** In-memory SQLite for local Next dev when DATABASE_URL is unset. */
export async function initApiStoreSqlite(): Promise<void> {
  setStore(null);
  setDb(createInMemoryDb());
  seedSlots();
}

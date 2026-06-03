import Database from 'better-sqlite3';
import path from 'path';

export type DB = Database.Database;

const DB_PATH = process.env['DB_PATH'] ?? path.join(process.cwd(), 'booking.db');

let _db: DB | null = null;

export function getDb(): DB {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  applyMigrations(_db);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function setDb(db: DB): void {
  _db = db;
}

export function createInMemoryDb(): DB {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

function applyMigrations(db: DB): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS page_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS slots (
      id         TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      starts_at  TEXT NOT NULL,
      duration_m INTEGER NOT NULL DEFAULT 30,
      is_active  INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id              TEXT PRIMARY KEY,
      slot_id         TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      status          TEXT NOT NULL DEFAULT 'active',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      cancelled_at    TEXT,
      FOREIGN KEY (slot_id) REFERENCES slots(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
      ON bookings(slot_id) WHERE status = 'active';

    CREATE INDEX IF NOT EXISTS idx_bookings_idempotency
      ON bookings(idempotency_key);
  `);

  const insert = db.prepare('INSERT OR IGNORE INTO page_config (key, value) VALUES (?, ?)');
  insert.run('title', 'Book a Session');
  insert.run('description', 'Pick a time slot that works for you.');
  insert.run('bg_image_url', '');
}

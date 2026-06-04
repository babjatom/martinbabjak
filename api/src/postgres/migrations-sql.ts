/**
 * Schema DDL bundled into Next.js serverless output (no runtime readFileSync).
 * Keep in sync with migrations.sql.
 */
export const MIGRATIONS_SQL = `
CREATE TABLE IF NOT EXISTS page_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slots (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  duration_m INTEGER NOT NULL DEFAULT 30,
  is_active  SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bookings (
  id              TEXT PRIMARY KEY,
  slot_id         TEXT NOT NULL REFERENCES slots(id),
  user_id         TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL,
  cancelled_at    TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
  ON bookings (slot_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_bookings_idempotency
  ON bookings (idempotency_key);
`;

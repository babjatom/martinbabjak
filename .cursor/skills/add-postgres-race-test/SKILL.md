---
name: add-postgres-race-test
description: Add Postgres concurrency race tests for Vercel Phase 2+. Use when adding concurrency.postgres.test.ts or parallel booking tests against Postgres.
---

# Postgres concurrency race test

1. Add a **new** test file (e.g. `api/src/__tests__/concurrency.postgres.test.ts`). Do **not** edit `api/src/__tests__/concurrency.test.ts`.
2. Fire parallel `POST /api/bookings` for the same slot with `Promise.all`; expect exactly one **201** and one **409** (order-independent).
3. Rely on partial unique index on `(slot_id) WHERE status = 'active'`; map unique violations to `SLOT_ALREADY_BOOKED`.
4. Booking implementation: transaction, re-check idempotency inside the transaction (CLAUDE.md → Vercel hosting migration, Phase 2+).
5. Do not make `Promise.all` sequential or change expected status codes.

# CLAUDE.md — Coding Constitution

Read this before making any changes. These rules are non-negotiable constraints.

## Stack

| Layer | Tech |
|-------|------|
| API runtime | Node.js 20, TypeScript 5, strict mode |
| HTTP | Express 4 |
| Database | SQLite via `better-sqlite3` (synchronous — do NOT swap for async driver) |
| Validation | Zod |
| Tests | Vitest + supertest |
| Frontend | Next.js 14, React 18, Tailwind CSS 3 |

## File Map

```
api/src/
  db.ts        — SQLite init, migrations, setDb/createInMemoryDb testability seam
  slots.ts     — Slot model, seed data, SlotNotFoundError
  config.ts    — PageConfig CRUD
  bookings.ts  — createBooking / getBooking / cancelBooking (core invariant lives here)
  routes.ts    — Thin Express handlers — dispatch errors, delegate to service functions
  app.ts       — createApp() factory (no listen)
  server.ts    — Entry point: seedSlots() then app.listen()
  __tests__/   — All test files

web/src/
  types.ts             — Shared TypeScript interfaces
  app/page.tsx         — Server component, fetches config + slots
  components/          — Client components
```

## THE INVARIANT — Never Break This

**Exactly one active booking per slot at a time.**

Enforced in `api/src/bookings.ts` via `bookSlot.immediate()`. The `immediate()` call
uses `BEGIN IMMEDIATE`, acquiring the SQLite write lock at transaction start. Two
concurrent requests for the same slot serialize here: the second sees the first's
committed booking and throws `SlotAlreadyBookedError`.

Do NOT:
- Change `.immediate()` to `.deferred()` or plain `bookSlot()`
- Add code paths that bypass the transaction
- Replace `better-sqlite3` with an async SQLite driver

## THE CONCURRENCY GATE — Do Not Touch

`api/src/__tests__/concurrency.test.ts` is a hard gate. Do NOT:
- Remove any `it(...)` block from this file
- Add `.skip` or `.todo` to any test in this file
- Make the `Promise.all` calls sequential
- Change the expected status codes (201 / 409)

You may add new concurrency tests (additions only). Never deletions or skips.
This file is explicitly checked by the agent task template in
`.github/agent-tasks/implement-feature.md`.

## Error Codes

| Status | Code |
|--------|------|
| 400 | `VALIDATION_ERROR` |
| 404 | `SLOT_NOT_FOUND`, `BOOKING_NOT_FOUND` |
| 409 | `SLOT_ALREADY_BOOKED`, `BOOKING_ALREADY_CANCELLED` |
| 500 | `INTERNAL_ERROR` |

## Response Shapes

```
POST /api/bookings   → { booking } — 201 (new) or 200 (idempotent)
GET  /api/bookings/:id → { booking }
DELETE /api/bookings/:id → { booking }
GET  /api/slots      → { slots }
POST /api/slots      → { slot } — 201
GET  /api/config     → { config }
PUT  /api/config     → { config }
```

Booking object: `{ id, slot_id, user_id, idempotency_key, status, created_at, cancelled_at }`

## TypeScript Rules

- No `any` — use `unknown` and narrow with type guards or Zod
- Explicit return type on every function
- `noUncheckedIndexedAccess` is on — handle `T | undefined` from array/object access
- No floating promises — always `await` or explicitly `void`

## Testing Rules

- Write tests before implementing (TDD)
- `setDb(createInMemoryDb())` in `beforeEach` — never share database state between tests
- New route → at minimum: happy path + validation error + not-found case
- Test files live in `api/src/__tests__/`

## Git — Conventional Commits

Required for **all agent PRs** and expected for human contributions. Full rules:
`.github/agent-tasks/commit-conventions.md`.

- Format: `type(optional-scope): imperative subject` (lowercase, no trailing period).
- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `style`, `perf`.
- Scopes: prefer `api`, `web`, `ci`, `agent` when applicable.
- **PR title** must match Conventional Commits (same as primary commit if squashing).
- Logical, atomic commits; never `[skip ci]` in messages.

## CI Rules

- All five CI jobs must pass before a PR merges: `api-typecheck`, `api-lint`, `api-test`, `web-typecheck`, `web-build`
- Do NOT add `[skip ci]` to commit messages
- Do NOT modify `.github/workflows/ci.yml`
- PRs target `main` — never self-merge

## Vercel hosting migration (epic)

Triggered by GitHub issues with label `vercel-hosting` and task file
`.github/agent-tasks/vercel-hosting.md` (workflow `agent-vercel.yml`). Implement **one phase per PR**.

| Phase | Scope | Stack notes |
|-------|--------|-------------|
| **0** | Human only: this section, Postgres in CI, hosted DB | Agents do not edit `ci.yml` |
| **1** | Domain behind a DB interface; `api` keeps SQLite | Existing invariant unchanged |
| **2** | Postgres adapter; **add** `concurrency.postgres.test.ts` | Partial unique index on `(slot_id) WHERE status = 'active'`; map unique violations to 409 |
| **3** | Next Route Handlers under `web/src/app/api/` | `export const runtime = 'nodejs'` for DB routes |
| **4** | Same-origin `/api`, remove Express / file SQLite | Update tests and file map when cutover completes |

**Invariant (all phases):** exactly one active booking per slot; parallel race tests use `Promise.all` and expect statuses **201** and **409** (order-independent).

**Concurrency gate file:** `api/src/__tests__/concurrency.test.ts` stays until Phase 4 cutover. Until then: no removals, skips, or weakening tests; additions allowed in other files.

**Phase 2+ Postgres booking:** use a transaction, re-check idempotency inside the transaction, rely on the partial unique index so concurrent inserts for the same slot yield one success and one **409** (`SLOT_ALREADY_BOOKED`).

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
  store.ts             — Store interface + SqliteStore
  postgres/            — PostgresStore, migrations, pool client
  db.ts                — SQLite init (local/tests)
  bookings.ts          — Booking domain (async; SQLite + Postgres paths)
  slots.ts, config.ts  — Domain modules
  http/handlers.ts     — Shared HTTP handlers (Express + Next)
  routes.ts, app.ts    — Express (optional local dev)
  runtime/init-store.ts — Wire Store for Route Handlers
  __tests__/           — SQLite tests + concurrency gate; Postgres tests separate

web/src/
  app/api/             — Next Route Handlers (`runtime = 'nodejs'`)
  app/page.tsx         — Server component
  components/          — Client components
  lib/api-route.ts     — Handler → NextResponse helper
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

Required for **all agent PRs** and expected for human contributions.

@.github/agent-tasks/commit-conventions.md

## CI Rules

- All five CI jobs must pass before a PR merges: `api-typecheck`, `api-lint`, `api-test`, `web-typecheck`, `web-build`
- Do NOT add `[skip ci]` to commit messages
- Do NOT modify `.github/workflows/ci.yml`
- PRs target `main` — never self-merge
- Do not read `package-lock.json` unless debugging a dependency resolution issue

## Skills

On-demand procedures live in `.cursor/skills/` and `.claude/skills/` (keep both trees identical when editing).

## Vercel hosting migration (epic)

Triggered by GitHub issues with label `vercel-hosting` and task file
`.github/agent-tasks/vercel-hosting.md` (workflow `agent-vercel.yml`). Implement **one phase per PR**.

| Phase | Scope | Stack notes |
|-------|--------|-------------|
| **0** | Postgres in CI (`api-test-postgres`), hosted DB docs | `ci.yml` Postgres job added for this epic |
| **1** | Domain behind a DB interface; `api` keeps SQLite | Existing invariant unchanged |
| **2** | Postgres adapter; **add** `concurrency.postgres.test.ts` | Partial unique index on `(slot_id) WHERE status = 'active'`; map unique violations to 409 |
| **3** | Next Route Handlers under `web/src/app/api/` | `export const runtime = 'nodejs'` for DB routes |
| **4** | Same-origin `/api` via Next Route Handlers; Express optional for local debug | `concurrency.test.ts` remains SQLite showcase; `concurrency.postgres.test.ts` is the Postgres gate |

**Invariant (all phases):** exactly one active booking per slot; parallel race tests use `Promise.all` and expect statuses **201** and **409** (order-independent).

Gate file rules: see **THE CONCURRENCY GATE** (unchanged until Phase 4 cutover). **Phase 2+ Postgres booking:** transaction, re-check idempotency inside the transaction, partial unique index → one **409** (`SLOT_ALREADY_BOOKED`) on concurrent inserts for the same slot.

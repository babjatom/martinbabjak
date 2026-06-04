# CLAUDE.md — Coding Constitution

Read this before making any changes. These rules are non-negotiable constraints.

## Stack

| Layer | Tech |
|-------|------|
| API runtime | Node.js 20, TypeScript 5, strict mode |
| HTTP | Express 4 |
| Database | Postgres (`pg`); SQLite removed |
| Validation | Zod |
| Tests | Vitest + supertest |
| Frontend | Next.js 14, React 18, Tailwind CSS 3 |

## File Map

```
api/src/
  store-registry.ts    — SeedSlot + getStore/setStore (PostgresStore)
  postgres/            — PostgresStore, migrations, pool client
  bookings.ts          — Booking domain (Postgres)
  slots.ts, config.ts  — Domain modules
  http/handlers.ts     — Shared HTTP handlers (Express + Next)
  routes.ts, app.ts    — Express (optional local dev)
  runtime/init-store.ts — Wire Store for Route Handlers
  __tests__/           — Postgres tests (DATABASE_URL); concurrency gate

web/src/
  app/api/             — Next Route Handlers (`runtime = 'nodejs'`)
  app/page.tsx         — Server component
  components/          — Client components
  lib/api-route.ts     — Handler → NextResponse helper
```

## THE INVARIANT — Never Break This

**Exactly one active booking per slot at a time.**

Enforced in `api/src/bookings.ts` via `PostgresStore.transactionAsync` and a partial
unique index on active bookings per slot; concurrent inserts yield one success and
`SlotAlreadyBookedError` (409). SQLite `BEGIN IMMEDIATE` path removed.

Do NOT:
- Add code paths that bypass the transaction
- Weaken `api/src/__tests__/concurrency.test.ts`

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
- Postgres tests: `DATABASE_URL` + truncate between cases (`helpers/postgres.ts`)
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

## Agent workflows (GitHub)

Workflow: `.github/workflows/agent.yml`. Trigger on an issue with label `api` or `web`:

- Comment **`@claude`** → Claude Code Action (GitHub runner)
- Comment **`@cursor`** → Cursor Cloud Agent (requires repo secret `CURSOR_API_KEY` and GitHub connected in Cursor)
- Assign **`github-actions[bot]`** without `@cursor` in the issue → **Claude** (same as before)

Do not put `@claude` and `@cursor` in the same comment or issue text.

| Label | Agent lanes | Claude model | Task file |
|-------|-------------|--------------|-----------|
| `api` | yes | Sonnet (`claude-sonnet-4-6`) | `implement-feature.md` |
| `web` | yes | Sonnet (`claude-sonnet-4-6`) | `implement-feature-web.md` |
| `infra` | no (human-only) | — | — |

Use **one** of `api` or `web` per issue (not both). Issue templates: `api_feature`, `web_feature`, `infra_task`.

Web lane caps (see `agent.yml`): **65** turns, **$4** budget. Issues must list **Files** and **Scope** only — no epic paste.

**Agent gotchas (web):** Book via `BookingSheet` / `handleBookingComplete`; route handlers use `jsonFromHandler(() => …)` after `initApiStore`; demo slot seeds off on Vercel production (`api/src/runtime/demo-seed.ts`); never edit `concurrency.test.ts`.

## Hosting

- API surface: Next Route Handlers under `web/src/app/api/` (`runtime = 'nodejs'`); shared handlers in `api/src/http/`.
- Database: Postgres only (`DATABASE_URL`); partial unique index enforces one active booking per slot.
- Express in `api/` remains optional for local debugging.

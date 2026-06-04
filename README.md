# Slot Booking — Agentic CI/CD Showcase

A full-stack portfolio project demonstrating **staff-level engineering judgment in agentic CI/CD**.

## The Thesis

The AI (Claude Code Action) is an untrusted contributor. The engineering value is in the
supervision layer: deterministic test gates the agent cannot bypass, scoped permissions the
agent cannot escalate, and a machine-readable constitution (CLAUDE.md) the agent must follow.

## The Product

A customisable slot-booking page. Visitors see available slots and book them. The page owner
can edit the hero (title, description, background image) and manage time slots inline via an
"Edit page" button — all without redeployment.

**Live editing:** click "Edit page" (bottom-right) → edit title/description/background → save.
Add or remove slots from the Slots tab.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/slots` | Available slots |
| `POST` | `/api/slots` | Add a slot |
| `DELETE` | `/api/slots/:id` | Remove a slot |
| `POST` | `/api/bookings` | Book a slot (idempotency key required) |
| `GET` | `/api/bookings/:id` | Fetch a booking |
| `DELETE` | `/api/bookings/:id` | Cancel a booking |
| `GET` | `/api/config` | Page config |
| `PUT` | `/api/config` | Update page config |

## The Concurrency Gate

`api/src/__tests__/concurrency.test.ts` is the primary showcase artifact. It fires two
simultaneous `POST /api/bookings` requests for the same slot via `Promise.all` and asserts
exactly one 201 and one 409. A second test proves locking is slot-scoped, not global.

**Why `better-sqlite3` (synchronous):** the synchronous driver means SQLite's own
`BEGIN IMMEDIATE` lock is the only serialization point — the test exercises the real
correctness mechanism.

**Why `Promise.all` and not sequential:** sequential calls serialize at the event loop
before the transaction begins. `Promise.all` submits both to the event loop simultaneously,
racing at the transaction boundary.

## Agentic Workflow

Assign an issue to `github-actions[bot]` or mention `@claude` in a comment.

**Vercel hosting epic:** use the **Vercel hosting** issue template (label `vercel-hosting`), then assign the bot or comment `@claude` with the phase to run. See `CLAUDE.md` → *Vercel hosting migration*.

The agent:
1. Reads the issue and `CLAUDE.md`
2. Writes tests first, then implements
3. Opens a PR — it cannot merge its own PR

Permissions: `contents: write`, `pull-requests: write`, `issues: write` — enough to
contribute, not enough to change branch protection.

## CI Gates (all required on `main`)

| Job | What it checks |
|-----|---------------|
| `api-typecheck` | TypeScript strict mode, `noUncheckedIndexedAccess` |
| `api-lint` | ESLint with `no-explicit-any`, `no-floating-promises` |
| `api-test` | Unit + integration + concurrency gate |
| `web-typecheck` | Next.js TypeScript strict mode |
| `web-build` | `next build` succeeds |

## Running locally

```bash
# Full stack (Next.js serves /api Route Handlers on port 3000)
cd api && npm install && npm run build
cd web && npm install && npm run dev

# Optional: Express API only (port 3001)
cd api && npm run dev

# Tests
cd api && npm test

# Type check + lint
cd api && npm run typecheck && npm run lint
```

## See also

- `CLAUDE.md` — coding constitution for the agent
- `.github/agent-tasks/implement-feature.md` — agent task template

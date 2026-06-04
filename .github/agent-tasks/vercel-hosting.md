# Agent Task: Vercel hosting

## Purpose

Migrate toward **everything on Vercel**: Next.js Route Handlers in `web`, hosted SQL (Postgres), same HTTP contract and booking invariant. Work in **phases** defined in the issue — never the full epic in one PR.

## Inputs

| Input | Description |
|-------|-------------|
| Issue number | Triggering issue (title usually "Vercel hosting") |
| Issue body | Which phase to implement this run |
| CLAUDE.md | Constitution; follow the **Vercel hosting migration** section when on `main` |

## Steps

1. **Read the issue.** Implement **only** the checked phase. If Phase 0 prerequisites are unchecked, comment on the issue and stop — do not guess Postgres/CI setup.

2. **Read `CLAUDE.md`** and **this file.** Follow the migration section for the active phase.

3. **Create a branch** `agent/issue-{N}-vercel-hosting-{phase-slug}`.

4. **Write tests first (TDD).** API tests stay in `api/src/__tests__/` until CLAUDE.md moves them; new Postgres race tests are **additions only** (skill: `add-postgres-race-test`).

5. **Implement the phase** using existing patterns (Zod in routes/handlers, service layer, error codes).

6. **Concurrency / invariant:** Preserve **THE INVARIANT**; gate file rules → **THE CONCURRENCY GATE** in CLAUDE.md. Postgres parallel races → skill `add-postgres-race-test`.

7. **Commit** with **Conventional Commits** (CLAUDE.md → Git); **PR title** must match (e.g. `feat(api): …`).

8. **Open a PR** to `main`: what phase, files changed, tests, how to run locally. Use `Part of #N` unless the issue says this phase `Closes #N`.

9. **Comment on the issue** with the PR link.

## Success criteria

- [ ] All existing CI-relevant commands pass for touched packages (`api` typecheck/lint/test; `web` typecheck/build if web changed)
- [ ] Phase scope only — no Express removal / no `ci.yml` / no Vercel dashboard work unless the issue explicitly assigns Phase 4 and prerequisites are met
- [ ] Booking invariant preserved or strengthened (partial unique index on Postgres when in Phase 2+)
- [ ] PR targets `main`; human merges
- [ ] Commits and PR title follow Conventional Commits

## Hard constraints

- Do NOT add `[skip ci]` to commits — CLAUDE.md → CI Rules
- Do NOT modify `.github/workflows/ci.yml` — CLAUDE.md → CI Rules
- Do NOT modify `api/src/__tests__/concurrency.test.ts` except as allowed in CLAUDE.md → THE CONCURRENCY GATE
- Do NOT merge the PR
- Do NOT change branch protection

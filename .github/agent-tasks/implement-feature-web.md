# Agent Task: Web feature from issue

For issues labeled **`web`** only (Haiku lane). Use **`api`** label and `implement-feature.md` for backend work.

## Inputs

| Input | Description |
|-------|-------------|
| Issue number | From the triggering event |
| Issue title | The feature name |
| Issue body | Requirements and acceptance criteria |

## Steps

1. **Read the issue.** Do not implement scope not described in the issue. Ask on the issue if unclear.

2. **Read `CLAUDE.md`** and **this file.**

3. **Create a branch** `agent/issue-{N}-{short-slug}`.

4. **Implement in `web/`** unless the issue explicitly requires shared API handlers under `api/src/http/`.

5. **Next + `externalDir`:** Dependencies for bundled `api` code live in `web/package.json`. Do not add `better-sqlite3` to `web`. Typecheck shims live under `web/types/` (e.g. `pg.d.ts`). Route handlers need `DATABASE_URL` at runtime.

6. **Verify** `npm run typecheck` and `npm run build` in `web/` when you change web or shared handler imports.

7. **Commit** with Conventional Commits; **PR title** must match.

8. **Open a PR** to `main` with description and test plan; **comment on the issue** with the PR link.

## Success Criteria

- [ ] `npm run typecheck` and `npm run build` pass in `web/` when web files changed
- [ ] No changes to `api/src/__tests__/concurrency.test.ts`
- [ ] PR targets `main`; `Closes #N` when appropriate

## Hard Constraints

- Do NOT modify `.github/workflows/ci.yml`
- Do NOT weaken or skip tests in `api/src/__tests__/concurrency.test.ts`
- Do NOT add `[skip ci]` to commits
- Do NOT merge the PR

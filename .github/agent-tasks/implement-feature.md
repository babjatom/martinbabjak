# Agent Task: Implement Feature from Issue

## Inputs

| Input | Description |
|-------|-------------|
| Issue number | From the triggering event |
| Issue title | The feature name |
| Issue body | Full requirements and acceptance criteria |

## Steps

1. **Read the issue.** Understand the complete requirements. Do not implement anything not
   described in the issue. If requirements are ambiguous, comment on the issue asking for
   clarification before writing code.

2. **Read `CLAUDE.md`** and **this file.** For issues labeled **`api`** (agent lane). Web
   issues use `implement-feature-web.md`; `infra` is human-only.

3. **Create a feature branch** named `agent/issue-{N}-{short-slug}`.

4. **Write tests first.** Following the TDD convention in CLAUDE.md, write tests for the
   new behaviour before implementing it. API tests go in `api/src/__tests__/`. Tests require
   `DATABASE_URL` (Postgres); see `helpers/postgres.ts`.

5. **Implement the feature.** Follow patterns in the existing source files. Match the
   error codes, response shapes, and TypeScript conventions in CLAUDE.md.

6. **Verify the concurrency gate is unmodified.** Run
   `git diff origin/main -- api/src/__tests__/concurrency.test.ts` and confirm the output
   is empty (no changes to that file).

7. **Commit** using **Conventional Commits** (see CLAUDE.md → Git). Every commit message
   and the **PR title** must follow `type(scope): subject`.

8. **Open a pull request** from your branch to `main`. The PR description must include:
   - What was implemented
   - Which files changed and why
   - Test coverage added
   - `Closes #N`

9. **Comment on the issue** with a link to the PR.

## Success Criteria

- [ ] All existing tests pass (no regressions)
- [ ] Concurrency gate unchanged — see CLAUDE.md → THE CONCURRENCY GATE
- [ ] New behaviour is covered by at least one unit test and one integration test
- [ ] `npm run typecheck` exits 0 in `api/`
- [ ] `npm run lint` exits 0 in `api/`
- [ ] `npm run build` exits 0 in `web/` (if web files were changed)
- [ ] PR opens against `main` with a clear description
- [ ] Commits and PR title follow Conventional Commits
- [ ] Original issue is referenced (`Closes #N`)

## Hard Constraints

- Do NOT add `[skip ci]` to any commit message — see CLAUDE.md → CI Rules
- Do NOT modify `.github/workflows/ci.yml` — see CLAUDE.md → CI Rules
- Do NOT modify `api/src/__tests__/concurrency.test.ts` except as allowed in CLAUDE.md → THE CONCURRENCY GATE
- Do NOT change branch protection settings
- Do NOT merge the PR — wait for human review

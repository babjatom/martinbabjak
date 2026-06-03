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

2. **Read CLAUDE.md.** Before writing any code, read the `CLAUDE.md` file at the repo root.
   All decisions must comply with the conventions and rules defined there.

3. **Create a feature branch** named `agent/issue-{N}-{short-slug}`.

4. **Write tests first.** Following the TDD convention in CLAUDE.md, write tests for the
   new behaviour before implementing it. API tests go in `api/src/__tests__/`.

5. **Implement the feature.** Follow patterns in the existing source files. Match the
   error codes, response shapes, and TypeScript conventions in CLAUDE.md.

6. **Verify the concurrency gate is unmodified.** Read `api/src/__tests__/concurrency.test.ts`
   and confirm it is unchanged from the main branch.

7. **Open a pull request** from your branch to `main`. The PR description must include:
   - What was implemented
   - Which files changed and why
   - Test coverage added
   - `Closes #N`

8. **Comment on the issue** with a link to the PR.

## Success Criteria

- [ ] All existing tests pass (no regressions)
- [ ] `api/src/__tests__/concurrency.test.ts` is not modified, skipped, or removed
- [ ] New behaviour is covered by at least one unit test and one integration test
- [ ] `npm run typecheck` exits 0 in `api/`
- [ ] `npm run lint` exits 0 in `api/`
- [ ] `npm run build` exits 0 in `web/` (if web files were changed)
- [ ] PR opens against `main` with a clear description
- [ ] Original issue is referenced (`Closes #N`)

## Hard Constraints

- Do NOT add `[skip ci]` to any commit message
- Do NOT modify `.github/workflows/ci.yml`
- Do NOT modify `api/src/__tests__/concurrency.test.ts` (additions only, never deletions or skips)
- Do NOT change branch protection settings
- Do NOT merge the PR — wait for human review

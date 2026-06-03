# Conventional Commits (required for agents)

All **git commits** and the **pull request title** must follow [Conventional Commits](https://www.conventionalcommits.org/).

## Commit message format

```
type(optional-scope): short imperative summary

Optional body explaining why (wrap at ~72 characters).
```

### Allowed types

| Type | Use for |
|------|---------|
| `feat` | New behaviour |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Tests only |
| `refactor` | Code change without behaviour change |
| `chore` | Tooling, deps, misc |
| `ci` | CI / workflow |
| `build` | Build system |
| `style` | Formatting, no logic change |
| `perf` | Performance |

### Scopes (when helpful)

`api`, `web`, `ci`, `agent` — optional but preferred for this monorepo.

### Rules

- **Subject:** imperative mood (`add` not `added`), lowercase, no trailing period, ~72 chars max.
- **No** `[skip ci]` in any commit message.
- Prefer **small, logical commits** (e.g. tests first, then implementation).
- **PR title** must use the same `type(scope): subject` format as the main commit (or squash summary).
- **PR description:** what/why, test plan, `Closes #N` or `Part of #N` as appropriate.

### Examples

```
feat(api): add Store interface for booking domain
test(api): cover SqliteStore seed idempotency
fix(web): handle empty slots on config fetch failure
ci(agent): pass prompt to claude-code-action v1
docs: document Vercel deploy prerequisites
```

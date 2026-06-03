# Trigger agent: Vercel hosting

## Prerequisites

- Repository secret **`ANTHROPIC_API_KEY`** (Settings → Secrets and variables → Actions).
- **[Claude GitHub App](https://github.com/apps/claude)** installed on this repo (recommended for PRs/comments).
- Workflows use `anthropics/claude-code-action@v1` with `id-token: write` (not Vercel).
- Issue label **`vercel-hosting`** for the Vercel epic workflow.

## Start a run

1. **New issue** → choose template **Vercel hosting** (adds label `vercel-hosting`).
2. Select **Phase** in the form; add notes if needed (e.g. Phase 3 resource).
3. Either:
   - **Assign** `github-actions[bot]`, or
   - Post a **comment** (not only the issue description): `@claude Implement Phase 1 only`

## If the workflow shows "Skipped"

- **`@claude` must include the `@`** — typing `claude` alone does not trigger.
- Prefer a **comment** on the issue; `@claude` in the description also works after the latest workflow update (save/edit the issue).
- Issue must have label **`vercel-hosting`** for the Vercel workflow. The default **Claude Code Agent** run will show **Skipped** on that issue — open **Claude Code Agent (Vercel hosting)** instead.
- Re-run: add a new comment with `@claude` (editing an old comment does not fire the workflow).

## What runs

| Label | Workflow | Task file |
|-------|----------|-----------|
| `vercel-hosting` | `Claude Code Agent (Vercel hosting)` | `.github/agent-tasks/vercel-hosting.md` |
| (none) | `Claude Code Agent` | `.github/agent-tasks/implement-feature.md` |

Watch **Actions** on GitHub for the workflow run.

## Phases

See `CLAUDE.md` → **Vercel hosting migration (epic)**. One phase per agent run; human merges each PR before the next phase.

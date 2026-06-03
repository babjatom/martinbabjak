# Trigger agent: Vercel hosting

## Prerequisites

- Repository secret `ANTHROPIC_API_KEY` is set.
- Changes on `main`: `agent-vercel.yml`, label `vercel-hosting`, task `vercel-hosting.md`.

## Start a run

1. **New issue** → choose template **Vercel hosting** (adds label `vercel-hosting`).
2. Select **Phase** in the form; add notes if needed (e.g. Phase 3 resource).
3. Either:
   - **Assign** `github-actions[bot]`, or
   - Comment: `@claude Implement Phase 1 only` (match the issue).

## What runs

| Label | Workflow | Task file |
|-------|----------|-----------|
| `vercel-hosting` | `Claude Code Agent (Vercel hosting)` | `.github/agent-tasks/vercel-hosting.md` |
| (none) | `Claude Code Agent` | `.github/agent-tasks/implement-feature.md` |

Watch **Actions** on GitHub for the workflow run.

## Phases

See `CLAUDE.md` → **Vercel hosting migration (epic)**. One phase per agent run; human merges each PR before the next phase.

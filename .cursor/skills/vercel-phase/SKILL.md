---
name: vercel-phase
description: Implement one Vercel hosting migration phase from a vercel-hosting issue. Use for label vercel-hosting or agent-vercel workflow.
---

# Vercel phase (one PR)

1. Read the issue; implement **only** the checked phase. Stop and comment if Phase 0 prerequisites are missing.
2. Follow `.github/agent-tasks/vercel-hosting.md` and CLAUDE.md → Vercel hosting migration.
3. Branch: `agent/issue-{N}-vercel-hosting-{phase-slug}`.
4. TDD first; one phase per PR. PR body: phase, files, tests, local run notes. Use `Part of #N` unless the issue says `Closes #N`.
5. Do not modify `.github/workflows/ci.yml`.
6. Phase 2+: use skill `add-postgres-race-test` for new Postgres race tests.

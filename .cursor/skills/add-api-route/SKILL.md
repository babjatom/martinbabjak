---
name: add-api-route
description: Add a new Express /api route in api/. Use when creating or changing API endpoints, Zod validation, or route tests.
---

# Add API route

1. Write tests first in `api/src/__tests__/` — happy path, `VALIDATION_ERROR` (400), and not-found (404) where applicable.
2. Add a Zod schema; map parse failures to 400 `VALIDATION_ERROR`.
3. Keep `routes.ts` thin; delegate to a service function in the matching module.
4. Use error codes and response shapes from CLAUDE.md.
5. Commits and PR title: Conventional Commits (CLAUDE.md → Git).

# Vercel hosting — local Postgres

## Environment

```bash
export DATABASE_URL=postgresql://booking:booking@localhost:5432/booking_dev
```

## Migrate and seed

From `api/`:

```bash
npm run db:migrate
npm run db:seed
```

## Tests

SQLite (default, includes concurrency gate):

```bash
cd api && npm test
```

Postgres (requires `DATABASE_URL`):

```bash
cd api && npm run test:postgres
```

## Next.js API routes

With `DATABASE_URL` set, Route Handlers use `PostgresStore`. Without it, handlers use in-memory SQLite for build/typecheck only.

Production and local default: same-origin `/api` via Next.js Route Handlers. Optional: run Express on port 3001 for API-only debugging (`cd api && npm run dev`).

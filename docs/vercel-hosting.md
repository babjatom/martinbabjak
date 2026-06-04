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

With `DATABASE_URL` set on the **Vercel project** (Production + Preview), Route Handlers use `PostgresStore`. Schema DDL ships in `api/src/postgres/migrations-sql.ts` (not read from disk at runtime).

Optional: set `API_URL` to your canonical site URL if server-side fetches must hit a custom domain instead of `VERCEL_URL`.

Production and local default: same-origin `/api` via Next.js Route Handlers. Optional: run Express on port 3001 for API-only debugging (`cd api && npm run dev`).

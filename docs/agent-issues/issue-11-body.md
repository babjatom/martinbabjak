# Paste into GitHub issue #11 (replace body)

**Depends on:** #10 / #17 merged (`BookingSheet` on `BookingPage`).

## Scope (this issue only)

- **`MyReservations.tsx`:** after successful book, append booking `id` to `localStorage` key `booking_ids`; on load fetch `GET /api/bookings/[id]`, drop 404/cancelled; comment that `GET /api/bookings?user_id=` is future backend.
- Optional: cancel via `DELETE /api/bookings/[id]`, remove id from `localStorage`.
- **`ClinicMap.tsx`:** hardcoded clinic address + `// TODO` config later; “Get directions” → Google/Apple maps URL (no SDK).
- List items link to map section (`#clinic-map` or similar).
- Compose both on `BookingPage.tsx`; hook `localStorage` on book success via `handleBookingComplete` / `onBooked`.

**Out of scope:** API/schema changes, therapist entity, config address fields, `BookingSheet` rework, view transitions (#12), parent epic #6.

## Files

- `web/src/components/MyReservations.tsx` (new)
- `web/src/components/ClinicMap.tsx` (new)
- `web/src/components/BookingPage.tsx`

## Acceptance

- [ ] Reservations list + map + directions link; book flow still works.
- [ ] `cd web && npm run typecheck && npm run lint`

## Agent briefing

- Booking entry: `BookingSheet` on `BookingPage`; success via `onBooked` / `handleBookingComplete`.
- Same-origin `/api/*`; Vercel needs `DATABASE_URL`.
- Demo slot seeds skipped in production; do not re-implement #10.

## Agent note

One PR to `main`. Trigger with `@claude` only on this issue (do not include #12 in this body).

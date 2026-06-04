# Paste into GitHub issue #12 (replace body)

**Depends on:** #11 merged (optional; booking confirm UX can proceed after #10/#17).

## Scope (this issue only)

- On confirm in `BookingSheet`, transition slot grid → confirmation via `document.startViewTransition`, instant fallback when unsupported.

**Out of scope:** `MyReservations`, `ClinicMap`, API changes, `BookingPage` layout beyond what `BookingSheet` needs.

## Files

- `web/src/components/BookingSheet.tsx`
- `web/src/app/globals.css` (if needed)

## Acceptance

- [ ] Works in supporting browsers; no break in Safari/Firefox without API.
- [ ] `cd web && npm run typecheck && npm run lint`

## Agent briefing

- Booking entry: `BookingSheet` on `BookingPage`.
- Do not implement #11 reservations/map in this PR.

## Agent note

One PR to `main`. Trigger with `@claude` only after #11 is merged or explicitly skipped.

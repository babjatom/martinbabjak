'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Slot, Booking } from '@/types';

/* ─── helpers ──────────────────────────────────────────────────── */

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Group slots by calendar date (YYYY-MM-DD key). */
function groupByDate(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = slot.starts_at.slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(slot);
    map.set(key, arr);
  }
  return map;
}

/* ─── public API ────────────────────────────────────────────────── */

export interface BookingSheetHandle {
  open: (slot?: Slot) => void;
  close: () => void;
}

export interface BookingSheetProps {
  slots: Slot[];
  onBooked: (booking: Booking) => void;
  onSlotsRefresh: () => void;
  /** Expose imperative handle via ref-like callback */
  handleRef?: (handle: BookingSheetHandle) => void;
}

/* ─── component ─────────────────────────────────────────────────── */

export default function BookingSheet({
  slots,
  onBooked,
  onSlotsRefresh,
  handleRef,
}: BookingSheetProps): React.ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollHostRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const dateGroups = groupByDate(slots);
  const dates = Array.from(dateGroups.keys()).sort();

  /* Auto-select first available date when sheet opens */
  const openSheet = useCallback((slot?: Slot): void => {
    setError(null);
    setSuccessMsg(null);
    setUserId('');
    if (slot) {
      setSelectedSlot(slot);
      setSelectedDate(slot.starts_at.slice(0, 10));
    } else {
      setSelectedSlot(null);
      setSelectedDate(dates[0] ?? null);
    }
    dialogRef.current?.showModal();
  }, [dates]);

  const closeSheet = useCallback((): void => {
    dialogRef.current?.close();
  }, []);

  /* Expose handle */
  useEffect(() => {
    handleRef?.({ open: openSheet, close: closeSheet });
  }, [handleRef, openSheet, closeSheet]);

  /* Close on backdrop click (click outside the sheet panel) */
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>): void => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const inPanel =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    // The <dialog> fill = backdrop; the sheet panel is the direct child div.
    // We detect a click directly on the <dialog> element (i.e. backdrop).
    if (e.target === dialogRef.current) {
      closeSheet();
    }
    void inPanel; // suppress unused warning
  };

  /* Keyboard: Esc is handled natively by <dialog>; trap focus inside */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const trapFocus = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener('keydown', trapFocus);
    return () => dialog.removeEventListener('keydown', trapFocus);
  }, []);

  /* ── booking POST ──────────────────────────────────────────────── */

  const handleConfirm = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedSlot || !userId.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          user_id: userId.trim(),
          idempotency_key: generateIdempotencyKey(),
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { booking: Booking };
        setSuccessMsg('Booking confirmed!');
        onBooked(data.booking);
        setTimeout(() => closeSheet(), 900);
      } else if (res.status === 409) {
        setError('This slot was just booked. Refreshing availability…');
        onSlotsRefresh();
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const slotsForDate = selectedDate ? (dateGroups.get(selectedDate) ?? []) : [];

  /* ── render ────────────────────────────────────────────────────── */

  return (
    <dialog
      ref={dialogRef}
      className="booking-sheet-dialog"
      aria-label="Book a slot"
      onClick={handleDialogClick}
    >
      {/* Scroll host with CSS scroll-snap: peek → half → full */}
      <div ref={scrollHostRef} className="booking-sheet-scroll-host">

        {/* Peek sentinel — snapping to this position = closed/peek */}
        <div className="booking-sheet-snap-peek" aria-hidden="true" />

        {/* Half panel snap point */}
        <div className="booking-sheet-snap-half" aria-hidden="true" />

        {/* Full panel — the visible sheet */}
        <div className="booking-sheet-panel booking-sheet-snap-full" role="document">
          {/* Drag handle */}
          <div className="booking-sheet-handle" aria-hidden="true" />

          {/* Close button */}
          <button
            className="booking-sheet-close"
            onClick={closeSheet}
            aria-label="Close booking sheet"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <h2 className="booking-sheet-title">Book a slot</h2>

          {/* ── Date chips (horizontal scroll-snap) ── */}
          {dates.length > 0 && (
            <section aria-label="Select date" className="booking-sheet-date-section">
              <p className="booking-sheet-section-label">Date</p>
              <div className="booking-sheet-date-strip" role="list">
                {dates.map((d) => (
                  <button
                    key={d}
                    role="listitem"
                    aria-pressed={selectedDate === d}
                    className={`booking-sheet-date-chip${selectedDate === d ? ' is-selected' : ''}`}
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedSlot(null);
                      setError(null);
                    }}
                  >
                    <span className="booking-sheet-date-chip__dow">
                      {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="booking-sheet-date-chip__day">
                      {new Date(d + 'T00:00:00').getDate()}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Time chips (2-column grid) ── */}
          {selectedDate && (
            <section aria-label="Select time" className="booking-sheet-time-section">
              <p className="booking-sheet-section-label">Time</p>
              <div className="booking-sheet-time-grid" role="list">
                {slotsForDate.map((slot, i) => {
                  const available = slot.is_active === 1;
                  return (
                    <button
                      key={slot.id}
                      role="listitem"
                      aria-pressed={selectedSlot?.id === slot.id}
                      aria-disabled={!available}
                      disabled={!available}
                      className={[
                        'booking-sheet-time-chip',
                        !available ? 'is-unavailable' : '',
                        selectedSlot?.id === slot.id ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ '--chip-index': i } as React.CSSProperties}
                      onClick={() => {
                        if (!available) return;
                        setSelectedSlot(slot);
                        setError(null);
                      }}
                    >
                      <span>{formatTime(slot.starts_at)}</span>
                      <span className="booking-sheet-time-chip__dur">{slot.duration_m}m</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Selected slot summary ── */}
          {selectedSlot && (
            <div className="booking-sheet-summary" aria-live="polite">
              <span>
                {formatDate(selectedSlot.starts_at)} · {formatTime(selectedSlot.starts_at)} · {selectedSlot.duration_m} min
              </span>
            </div>
          )}

          {/* ── Confirm form ── */}
          <form
            onSubmit={(e) => void handleConfirm(e)}
            className="booking-sheet-form"
            aria-label="Confirm booking"
          >
            <label htmlFor="bs-user-id" className="booking-sheet-form__label">
              Your name or email
            </label>
            <input
              id="bs-user-id"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. jane@example.com"
              required
              autoComplete="email"
              className="booking-sheet-form__input"
            />

            {error && (
              <p role="alert" className="booking-sheet-form__error">
                {error}
              </p>
            )}

            {successMsg && (
              <p role="status" className="booking-sheet-form__success">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedSlot || !userId.trim()}
              className="booking-sheet-form__submit"
            >
              {loading ? 'Booking…' : 'Confirm booking'}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Booking, Slot } from '@/types';

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

/* ─── booking sheet ────────────────────────────────────────────── */

const DIRECTIONS_ADDRESS = 'Lastomírska 6968/7A, 071 01 Michalovce, Slovakia';
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DIRECTIONS_ADDRESS)}`;

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

export default function BookingSheet({
  slots,
  onBooked,
  onSlotsRefresh,
  handleRef,
}: BookingSheetProps): React.ReactElement {
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const firstActiveSlot = slots.find((s) => s.is_active === 1) ?? slots[0] ?? null;

  const openSheet = useCallback(
    (slot?: Slot): void => {
      setError(null);
      setSuccessMsg(null);
      setLoading(false);
      setPhone('');
      setSelectedSlot(slot ?? firstActiveSlot);
      setIsOpen(true);
    },
    [firstActiveSlot],
  );

  const closeSheet = useCallback((): void => {
    setIsOpen(false);
  }, []);

  /* Expose handle */
  useEffect(() => {
    handleRef?.({ open: openSheet, close: closeSheet });
  }, [handleRef, openSheet, closeSheet]);

  /* ESC closes */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeSheet]);

  /* Prevent background scroll while open */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /* Focus phone input when opened */
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => phoneInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  const handleConfirm = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedSlot) return;

    const userId = phone.trim();
    if (!userId) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          user_id: userId,
          idempotency_key: generateIdempotencyKey(),
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { booking: Booking };
        setSuccessMsg('Booking confirmed!');
        onBooked(data.booking);
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

  return (
    <div className={`booking-drawer${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      <div className="booking-drawer-backdrop" onClick={closeSheet} />

      <div
        className="booking-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Book a session"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Drag handle */}
        <div className="booking-sheet-handle" aria-hidden="true" />

        {/* Close button */}
        <button className="booking-sheet-close" onClick={closeSheet} aria-label="Close booking sheet">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="booking-sheet-title">Book a session</h2>

        {selectedSlot && (
          <div className="booking-sheet-summary" aria-live="polite">
            <span>
              {formatDate(selectedSlot.starts_at)} · {formatTime(selectedSlot.starts_at)} · {selectedSlot.duration_m} min
            </span>
          </div>
        )}

        {!successMsg ? (
          <form onSubmit={(e) => void handleConfirm(e)} className="booking-sheet-form" aria-label="Confirm booking">
            <label htmlFor="bs-user-phone" className="booking-sheet-form__label">
              Phone number
            </label>
            <input
              ref={phoneInputRef}
              id="bs-user-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+421 ..."
              required
              autoComplete="tel"
              className="booking-sheet-form__input"
            />

            {error && (
              <p role="alert" className="booking-sheet-form__error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedSlot || !phone.trim()}
              className="booking-sheet-form__submit"
            >
              {loading ? 'Booking…' : 'Submit'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p role="status" className="booking-sheet-form__success">
              {successMsg}
            </p>

            <div className="booking-sheet-directions">
              <div className="booking-sheet-map-preview" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900">How to get there</p>
                <p className="text-xs text-gray-500">{DIRECTIONS_ADDRESS}</p>
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="booking-sheet-direction-link"
                >
                  Get directions
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

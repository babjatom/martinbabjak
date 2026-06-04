'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Booking } from '@/types';

const STORAGE_KEY = 'booking_ids';

function loadIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    return [];
  } catch {
    return [];
  }
}

/** Append a booking id to localStorage after a successful book. */
export function appendBookingId(id: string): void {
  if (typeof window === 'undefined') return;
  const ids = loadIds();
  if (!ids.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
  }
}

function removeBookingId(id: string): void {
  const ids = loadIds().filter((v) => v !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function MyReservations(): React.ReactElement {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async (): Promise<void> => {
    const ids = loadIds();
    if (ids.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // TODO: replace per-id fetches with GET /api/bookings?user_id= once backend supports it
    const results = await Promise.allSettled(
      ids.map(async (id): Promise<Booking | null> => {
        const res = await fetch(`/api/bookings/${id}`);
        if (!res.ok) return null; // drop 404 and other errors
        const data = (await res.json()) as { booking: Booking };
        return data.booking;
      }),
    );

    const active: Booking[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value !== null && r.value.status !== 'cancelled') {
        active.push(r.value);
      }
    }
    setBookings(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        removeBookingId(id);
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
    } catch {
      // silently ignore cancel errors
    }
  };

  if (loading) {
    return (
      <section className="py-8 px-4 max-w-5xl mx-auto w-full" aria-label="My reservations">
        <p className="text-sm text-gray-400">Loading reservations…</p>
      </section>
    );
  }

  if (bookings.length === 0) return <></>;

  return (
    <section
      id="my-reservations"
      className="py-8 px-4 max-w-5xl mx-auto w-full"
      aria-label="My reservations"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-3">My reservations</h2>
      <ul className="space-y-3">
        {bookings.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-800">
                {new Date(b.created_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-xs text-gray-400 font-mono">{b.id}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#clinic-map"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                aria-label="View clinic location"
              >
                View location ↓
              </a>
              <button
                onClick={() => void handleCancel(b.id)}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
                aria-label={`Cancel booking ${b.id}`}
              >
                Cancel
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

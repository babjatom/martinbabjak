'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Booking, PageConfig, Slot } from '@/types';

interface Props {
  initialConfig: PageConfig;
}

type Tab = 'page' | 'slots';

interface NewSlotForm {
  label: string;
  starts_at: string;
  duration_m: number;
}

const EMPTY_SLOT: NewSlotForm = { label: '', starts_at: '', duration_m: 30 };

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function formatBookingTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function fetchAllSlots(): Promise<Slot[]> {
  const res = await fetch('/api/slots/all');
  if (!res.ok) return [];
  return ((await res.json()) as { slots: Slot[] }).slots;
}

async function fetchActiveBookings(): Promise<Booking[]> {
  const res = await fetch('/api/bookings');
  if (!res.ok) {
    throw new Error(`Failed to load bookings (${res.status}).`);
  }
  const data = (await res.json()) as { bookings: Booking[] };
  return data.bookings.filter((booking) => booking.status === 'active');
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
    message?: string;
  } | null;
  return body?.message ?? fallback;
}

export default function EditPanel({ initialConfig }: Props): React.ReactElement {
  const [tab, setTab] = useState<Tab>('page');
  const [config, setConfig] = useState<PageConfig>(initialConfig);
  const [draft, setDraft] = useState<PageConfig>(initialConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState<NewSlotForm>(EMPTY_SLOT);
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const refreshAllSlots = useCallback(async (): Promise<void> => {
    setLoadingSlots(true);
    setSlotError(null);
    try {
      const slots = await fetchAllSlots();
      setAllSlots(slots);
    } catch {
      setSlotError('Failed to load slots.');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const refreshBookings = useCallback(async (): Promise<void> => {
    setLoadingBookings(true);
    setBookingError(null);
    try {
      const activeBookings = await fetchActiveBookings();
      setBookings(activeBookings);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to load bookings.');
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    void refreshBookings();
  }, [refreshBookings]);

  useEffect(() => {
    if (tab === 'slots') {
      void refreshAllSlots();
    }
  }, [tab, refreshAllSlots]);

  const handleSaveConfig = async (): Promise<void> => {
    setSavingConfig(true);
    setConfigMessage(null);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const data = (await res.json()) as { config: PageConfig };
        setConfig(data.config);
        setConfigMessage('Page settings saved.');
      } else {
        setConfigMessage(await readApiError(res, `Failed to save page settings (${res.status}).`));
      }
    } catch {
      setConfigMessage('Network error.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddSlot = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newSlot.label || !newSlot.starts_at) return;

    setAddingSlot(true);
    setSlotError(null);

    try {
      const startsAtDate = new Date(newSlot.starts_at);
      if (Number.isNaN(startsAtDate.getTime())) {
        setSlotError('Invalid date or time.');
        return;
      }

      const startsAt = startsAtDate.toISOString();
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSlot.label, starts_at: startsAt, duration_m: newSlot.duration_m }),
      });

      if (res.ok) {
        await refreshAllSlots();
        setNewSlot(EMPTY_SLOT);
      } else {
        setSlotError(await readApiError(res, `Failed to add slot (${res.status}).`));
      }
    } catch {
      setSlotError('Network error.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (id: string): Promise<void> => {
    setDeletingId(id);
    setSlotError(null);
    try {
      const res = await fetch(`/api/slots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshAllSlots();
      } else {
        setSlotError(await readApiError(res, `Failed to remove slot (${res.status}).`));
      }
    } catch {
      setSlotError('Network error.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelBooking = async (id: string): Promise<void> => {
    setCancellingId(id);
    setBookingError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshBookings();
      } else {
        setBookingError(await readApiError(res, `Failed to cancel booking (${res.status}).`));
      }
    } catch {
      setBookingError('Network error.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">Owner admin</p>
            <h1 className="text-3xl font-bold text-gray-950">Bookings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage active bookings, page content, and appointment slots.
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View booking page
          </Link>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Active bookings</h2>
              <p className="text-sm text-gray-500">Canceling a booking refreshes this list.</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshBookings()}
              disabled={loadingBookings}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingBookings ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="p-5">
            {bookingError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{bookingError}</p>
            )}
            {loadingBookings && bookings.length === 0 ? (
              <p className="text-sm text-gray-500">Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-gray-500">No active bookings.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="py-2 pr-4 font-semibold">Booking ID</th>
                      <th className="px-4 py-2 font-semibold">Slot ID</th>
                      <th className="px-4 py-2 font-semibold">User ID</th>
                      <th className="px-4 py-2 font-semibold">Created</th>
                      <th className="py-2 pl-4 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="max-w-56 py-3 pr-4 font-mono text-xs text-gray-700">
                          <span className="block truncate">{booking.id}</span>
                        </td>
                        <td className="max-w-56 px-4 py-3 font-mono text-xs text-gray-500">
                          <span className="block truncate">{booking.slot_id}</span>
                        </td>
                        <td className="max-w-48 px-4 py-3 font-mono text-xs text-gray-500">
                          <span className="block truncate">{booking.user_id}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatBookingTime(booking.created_at)}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            type="button"
                            onClick={() => void handleCancelBooking(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                          >
                            {cancellingId === booking.id ? 'Canceling...' : 'Cancel'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Page and slots</h2>
          </div>

          <div className="flex border-b border-gray-100">
            {(['page', 'slots'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'page' && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Background image URL
                  </label>
                  <input
                    type="url"
                    value={draft.bg_image_url}
                    onChange={(e) => setDraft((d) => ({ ...d, bg_image_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {configMessage && (
                  <p className="text-sm text-gray-600">{configMessage}</p>
                )}
                <button
                  type="button"
                  onClick={() => void handleSaveConfig()}
                  disabled={savingConfig}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingConfig ? 'Saving...' : 'Save page settings'}
                </button>
              </div>
            )}

            {tab === 'slots' && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                        Existing slots
                      </h3>
                      <p className="text-sm text-gray-500">Use remove to soft-delete active slots.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshAllSlots()}
                      disabled={loadingSlots}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loadingSlots ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  {slotError && (
                    <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{slotError}</p>
                  )}
                  {loadingSlots && allSlots.length === 0 ? (
                    <p className="text-sm text-gray-500">Loading slots...</p>
                  ) : allSlots.length === 0 ? (
                    <p className="text-sm text-gray-500">No slots yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {allSlots.map((slot) => (
                        <li
                          key={slot.id}
                          className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm ${
                            slot.is_active === 1
                              ? 'border-gray-200 bg-white'
                              : 'border-gray-100 bg-gray-50 opacity-70'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-900">{slot.label}</p>
                            <p className="text-xs text-gray-500">{formatSlotTime(slot.starts_at)}</p>
                            <p className="text-xs text-gray-400">{slot.duration_m} minutes</p>
                            {slot.is_active === 0 && (
                              <p className="mt-0.5 text-xs text-gray-400">Removed</p>
                            )}
                          </div>
                          {slot.is_active === 1 && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteSlot(slot.id)}
                              disabled={deletingId === slot.id}
                              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                              aria-label={`Remove ${slot.label}`}
                            >
                              {deletingId === slot.id ? 'Removing...' : 'Remove'}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <form onSubmit={(e) => void handleAddSlot(e)} className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Add slot</h3>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Label</label>
                    <input
                      type="text"
                      value={newSlot.label}
                      onChange={(e) => setNewSlot((s) => ({ ...s, label: e.target.value }))}
                      placeholder="e.g. Friday 14:00"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Date & time</label>
                    <input
                      type="datetime-local"
                      value={newSlot.starts_at}
                      onChange={(e) => setNewSlot((s) => ({ ...s, starts_at: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Duration</label>
                    <select
                      value={newSlot.duration_m}
                      onChange={(e) => setNewSlot((s) => ({ ...s, duration_m: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[15, 30, 45, 60, 90, 120].map((m) => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={addingSlot || !newSlot.label || !newSlot.starts_at}
                    className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {addingSlot ? 'Adding...' : 'Add slot'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

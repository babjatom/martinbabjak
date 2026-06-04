'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PageConfig, Slot } from '@/types';

interface Props {
  isOpen: boolean;
  config: PageConfig;
  onConfigChange: (config: PageConfig) => void;
  onSlotsChange: (slots: Slot[]) => void;
  onClose: () => void;
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

async function fetchAllSlots(): Promise<Slot[]> {
  const res = await fetch('/api/slots/all');
  if (!res.ok) return [];
  return ((await res.json()) as { slots: Slot[] }).slots;
}

export default function EditPanel({
  isOpen,
  config,
  onConfigChange,
  onSlotsChange,
  onClose,
}: Props): React.ReactElement {
  const [tab, setTab] = useState<Tab>('page');
  const [draft, setDraft] = useState<PageConfig>(config);
  const [savingConfig, setSavingConfig] = useState(false);
  const [newSlot, setNewSlot] = useState<NewSlotForm>(EMPTY_SLOT);
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshAllSlots = useCallback(async (): Promise<void> => {
    setLoadingSlots(true);
    try {
      const slots = await fetchAllSlots();
      setAllSlots(slots);
      onSlotsChange(slots);
    } finally {
      setLoadingSlots(false);
    }
  }, [onSlotsChange]);

  useEffect(() => {
    if (isOpen && tab === 'slots') {
      void refreshAllSlots();
    }
  }, [isOpen, tab, refreshAllSlots]);

  const handleSaveConfig = async (): Promise<void> => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const data = (await res.json()) as { config: PageConfig };
        onConfigChange(data.config);
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newSlot.label || !newSlot.starts_at) return;

    setAddingSlot(true);
    setSlotError(null);

    try {
      const startsAt = new Date(newSlot.starts_at).toISOString();
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSlot.label, starts_at: startsAt, duration_m: newSlot.duration_m }),
      });

      if (res.ok) {
        await refreshAllSlots();
        setNewSlot(EMPTY_SLOT);
      } else {
        const errBody = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
          details?: unknown;
        } | null;
        const detail =
          errBody?.message ??
          (errBody?.error === 'VALIDATION_ERROR' ? 'Invalid date or fields.' : null);
        setSlotError(detail ?? `Failed to add slot (${res.status}).`);
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
        setSlotError(`Failed to remove slot (${res.status}).`);
      }
    } catch {
      setSlotError('Network error.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Edit page</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['page', 'slots'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'page' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Background image URL
                </label>
                <input
                  type="url"
                  value={draft.bg_image_url}
                  onChange={(e) => setDraft((d) => ({ ...d, bg_image_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => void handleSaveConfig()}
                disabled={savingConfig}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {savingConfig ? 'Saving…' : 'Save page settings'}
              </button>
            </div>
          )}

          {tab === 'slots' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Existing slots
                </p>
                {loadingSlots && allSlots.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : allSlots.length === 0 ? (
                  <p className="text-sm text-gray-400">No slots yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {allSlots.map((slot) => (
                      <li
                        key={slot.id}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                          slot.is_active === 1
                            ? 'border-gray-200 bg-white'
                            : 'border-gray-100 bg-gray-50 opacity-70'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{slot.label}</p>
                          <p className="text-xs text-gray-500">{formatSlotTime(slot.starts_at)}</p>
                          {slot.is_active === 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">Removed</p>
                          )}
                        </div>
                        {slot.is_active === 1 && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteSlot(slot.id)}
                            disabled={deletingId === slot.id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                            aria-label={`Remove ${slot.label}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={(e) => void handleAddSlot(e)} className="space-y-3 border-t pt-5">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Add slot</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={newSlot.label}
                    onChange={(e) => setNewSlot((s) => ({ ...s, label: e.target.value }))}
                    placeholder="e.g. Friday 14:00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date & time</label>
                  <input
                    type="datetime-local"
                    value={newSlot.starts_at}
                    onChange={(e) => setNewSlot((s) => ({ ...s, starts_at: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Duration</label>
                  <select
                    value={newSlot.duration_m}
                    onChange={(e) => setNewSlot((s) => ({ ...s, duration_m: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>{m} min</option>
                    ))}
                  </select>
                </div>
                {slotError && (
                  <p className="text-xs text-red-600">{slotError}</p>
                )}
                <button
                  type="submit"
                  disabled={addingSlot || !newSlot.label || !newSlot.starts_at}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                >
                  {addingSlot ? 'Adding…' : 'Add slot'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

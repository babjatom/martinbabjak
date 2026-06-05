'use client';

import { useRef, useState, useCallback } from 'react';
import type { PageConfig, Slot, Booking } from '@/types';
import BookingHero from './BookingHero';
import EditPanel from './EditPanel';
import StickyBookBar from './StickyBookBar';
import BookingSheet, { type BookingSheetHandle } from './BookingSheet';
import MyReservations, { appendBookingId } from './MyReservations';
import ClinicMap from './ClinicMap';

interface Props {
  initialConfig: PageConfig;
  initialSlots: Slot[];
}

function formatDow(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function BookingPage({ initialConfig, initialSlots }: Props): React.ReactElement {
  const [config, setConfig] = useState<PageConfig>(initialConfig);
  const [slots, setSlots] = useState<Slot[]>(initialSlots.filter((s) => s.is_active === 1));
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const sheetHandleRef = useRef<BookingSheetHandle | null>(null);

  const handleBookingComplete = (booking: Booking): void => {
    setCompletedBooking(booking);
    // Persist booking id so MyReservations can display it on next load
    appendBookingId(booking.id);
    // Remove the booked slot from available list
    setSlots((prev) => prev.filter((s) => s.id !== booking.slot_id));
  };

  const handleSlotsChange = (updated: Slot[]): void => {
    setSlots(updated.filter((s) => s.is_active === 1));
  };

  const handleSlotsRefresh = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/slots');
      if (res.ok) {
        const data = (await res.json()) as { slots: Slot[] };
        setSlots(data.slots.filter((s) => s.is_active === 1));
      }
    } catch {
      // silently ignore refresh errors
    }
  }, []);

  const handleOpenSheet = useCallback(
    (slot: Slot): void => {
      sheetHandleRef.current?.open(slot);
    },
    [],
  );

  const handleScrollToSlots = useCallback((): void => {
    document.getElementById('available-slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <BookingHero
        config={config}
        onConfigChange={setConfig}
        isEditOpen={isEditOpen}
      />


      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <div className="py-6 space-y-6">
          {completedBooking ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Booking confirmed!</h2>
              <p className="text-gray-500 mb-4">
                Your booking ID is{' '}
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{completedBooking.id}</span>
              </p>
              <button
                onClick={() => setCompletedBooking(null)}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Book another slot
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm">
              {slots.length === 0
                ? 'No slots available right now.'
                : `${slots.length} slot${slots.length === 1 ? '' : 's'} available — tap a slot to book.`}
            </p>
          )}

          <section id="available-slots" aria-label="Available slots" className="pt-2">
            <h2 className="text-lg font-semibold text-gray-900 px-1 mb-3">Available slots</h2>
            {slots.length === 0 ? (
              <p className="text-gray-500 text-sm px-1">Check back later.</p>
            ) : (
              <div className="slot-strip" role="list" aria-label="Swipeable slot list">
                {slots.map((slot) => {
                  const dow = formatDow(slot.starts_at);
                  const time = formatTime(slot.starts_at);
                  const date = formatDate(slot.starts_at);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      role="listitem"
                      className="slot-chip"
                      onClick={() => handleOpenSheet(slot)}
                      aria-label={`Book ${dow} ${date} at ${time}`}
                    >
                      <span className="slot-chip__dow">{dow}</span>
                      <span className="slot-chip__time">{time}</span>
                      <span className="slot-chip__dur">{slot.duration_m}m</span>
                      <span className="slot-chip__date">{date}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <MyReservations />

      <ClinicMap />

      {/* Sheet is always rendered but only opens when triggered — never visible on page load */}
      <BookingSheet
        slots={slots}
        onBooked={handleBookingComplete}
        onSlotsRefresh={() => void handleSlotsRefresh()}
        handleRef={(h) => { sheetHandleRef.current = h; }}
      />

      <EditPanel
        isOpen={isEditOpen}
        config={config}
        onConfigChange={setConfig}
        onSlotsChange={handleSlotsChange}
        onClose={() => setIsEditOpen(false)}
      />

      <StickyBookBar onBookClick={handleScrollToSlots} />

      <button
        onClick={() => setIsEditOpen((o) => !o)}
        className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium hover:bg-gray-700 transition-colors z-40 flex items-center gap-2"
        aria-label="Toggle edit mode"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {isEditOpen ? 'Done editing' : 'Edit page'}
      </button>
    </div>
  );
}

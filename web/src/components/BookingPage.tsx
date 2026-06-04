'use client';

import { useState } from 'react';
import type { PageConfig, Slot, Booking } from '@/types';
import BookingHero from './BookingHero';
import SlotGrid from './SlotGrid';
import BookingModal from './BookingModal';
import EditPanel from './EditPanel';
import StickyBookBar from './StickyBookBar';
import TherapistCards from './TherapistCards';

interface Props {
  initialConfig: PageConfig;
  initialSlots: Slot[];
}

export default function BookingPage({ initialConfig, initialSlots }: Props): React.ReactElement {
  const [config, setConfig] = useState<PageConfig>(initialConfig);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const handleBookingComplete = (booking: Booking): void => {
    setCompletedBooking(booking);
    setSelectedSlot(null);
    // Remove the booked slot from available list
    setSlots((prev) => prev.filter((s) => s.id !== booking.slot_id));
  };

  const handleSlotsChange = (updated: Slot[]): void => {
    setSlots(updated.filter((s) => s.is_active === 1));
  };

  const handleBookBarClick = (): void => {
    if (slots.length > 0) {
      setSelectedSlot(slots[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BookingHero
        config={config}
        onConfigChange={setConfig}
        isEditOpen={isEditOpen}
      />

      <section className="w-full py-6">
        <h2 className="text-lg font-semibold text-gray-900 px-4 mb-3">Your therapist</h2>
        <TherapistCards onOpenBooking={handleBookBarClick} />
      </section>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12">
        {completedBooking ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Booking confirmed!</h2>
            <p className="text-gray-500 mb-6">
              Your booking ID is <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{completedBooking.id}</span>
            </p>
            <button
              onClick={() => setCompletedBooking(null)}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Book another slot
            </button>
          </div>
        ) : (
          <SlotGrid
            slots={slots}
            onBook={setSelectedSlot}
            isEditOpen={isEditOpen}
            onSlotsChange={handleSlotsChange}
          />
        )}
      </main>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingComplete}
        />
      )}

      <EditPanel
        isOpen={isEditOpen}
        config={config}
        onConfigChange={setConfig}
        onSlotsChange={handleSlotsChange}
        onClose={() => setIsEditOpen(false)}
      />

      <StickyBookBar onBookClick={handleBookBarClick} />

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

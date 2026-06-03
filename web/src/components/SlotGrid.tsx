import type { Slot } from '@/types';

interface Props {
  slots: Slot[];
  onBook: (slot: Slot) => void;
  isEditOpen: boolean;
  onSlotsChange: (slots: Slot[]) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

async function deleteSlot(id: string): Promise<void> {
  await fetch(`/api/slots/${id}`, { method: 'DELETE' });
}

async function fetchAllSlots(): Promise<Slot[]> {
  const res = await fetch('/api/slots/all');
  if (!res.ok) return [];
  return ((await res.json()) as { slots: Slot[] }).slots;
}

export default function SlotGrid({ slots, onBook, isEditOpen, onSlotsChange }: Props): React.ReactElement {
  const handleDelete = async (id: string): Promise<void> => {
    await deleteSlot(id);
    const updated = await fetchAllSlots();
    onSlotsChange(updated);
  };

  if (slots.length === 0 && !isEditOpen) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No slots available at the moment.</p>
        <p className="text-sm mt-2">Check back later or contact us.</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Available times</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
          >
            <div>
              <p className="font-semibold text-gray-900">{slot.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{formatTime(slot.starts_at)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{slot.duration_m} min</p>
            </div>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => onBook(slot)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Book
              </button>
              {isEditOpen && (
                <button
                  onClick={() => void handleDelete(slot.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label={`Delete ${slot.label}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

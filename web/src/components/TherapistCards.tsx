'use client';

import Image from 'next/image';
import type { Therapist } from '@/types';

const DEFAULT_THERAPISTS: Therapist[] = [
  {
    id: '1',
    name: 'Dr. Martin Babjak',
    specialty: 'Cognitive Behavioural Therapy',
    avatarUrl: '/therapist-avatar.jpg',
  },
];

interface Props {
  therapists?: Therapist[];
  onOpenBooking: () => void;
}

export default function TherapistCards({
  therapists = DEFAULT_THERAPISTS,
  onOpenBooking,
}: Props): React.ReactElement {
  return (
    <div
      className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-2"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {therapists.map((therapist) => (
        <div
          key={therapist.id}
          className="therapist-card snap-center flex-none w-56"
        >
          <button
            type="button"
            className="therapist-card__inner w-full bg-white rounded-2xl shadow-md p-5 flex flex-col items-center gap-3 border-2 border-transparent cursor-pointer transition-[transform,border-color] duration-200 select-none hover:shadow-lg focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
            onClick={onOpenBooking}
          >
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-indigo-50 flex-shrink-0">
              <Image
                src={therapist.avatarUrl}
                alt={therapist.name}
                width={80}
                height={80}
                className="rounded-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-indigo-600">
                {therapist.name.charAt(0)}
              </span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-sm">{therapist.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{therapist.specialty}</p>
            </div>
            <span className="mt-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
              Book now
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

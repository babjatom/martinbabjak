'use client';

// TODO: load clinic address from config API once address fields are added to the config schema

const CLINIC_NAME = 'Wellness Therapy Clinic';
const CLINIC_ADDRESS = '123 Healing Street, San Francisco, CA 94102';

const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLINIC_ADDRESS)}`;
const APPLE_MAPS_URL = `https://maps.apple.com/?q=${encodeURIComponent(CLINIC_ADDRESS)}`;

export default function ClinicMap(): React.ReactElement {
  return (
    <section id="clinic-map" className="py-10 px-4 max-w-5xl mx-auto w-full" aria-label="Clinic location">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinic location</h2>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Static map placeholder — replace with an embedded map when a maps integration is added */}
        <div
          className="h-40 bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            className="w-10 h-10 text-indigo-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
        </div>
        <div className="px-5 py-4 flex flex-col gap-1">
          <p className="font-medium text-gray-900">{CLINIC_NAME}</p>
          <p className="text-sm text-gray-500">{CLINIC_ADDRESS}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
            >
              Get directions (Google)
            </a>
            <a
              href={APPLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
            >
              Apple Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

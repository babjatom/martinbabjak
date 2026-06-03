'use client';

import { useState } from 'react';
import type { PageConfig } from '@/types';

interface Props {
  config: PageConfig;
  onConfigChange: (config: PageConfig) => void;
  isEditOpen: boolean;
}

export default function BookingHero({ config, onConfigChange, isEditOpen }: Props): React.ReactElement {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<PageConfig>(config);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  const bgStyle = config.bg_image_url
    ? { backgroundImage: `url(${config.bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <header
      className="relative min-h-64 flex items-center justify-center text-center px-6 py-16 bg-gradient-to-br from-indigo-600 to-purple-700"
      style={bgStyle}
    >
      {config.bg_image_url && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 max-w-2xl mx-auto">
        {isEditOpen ? (
          <div className="space-y-3">
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Page title"
              className="w-full text-3xl font-bold text-center bg-white/20 text-white placeholder-white/60 border border-white/40 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Description"
              rows={2}
              className="w-full text-lg text-center bg-white/20 text-white placeholder-white/60 border border-white/40 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
            />
            <input
              type="url"
              value={draft.bg_image_url}
              onChange={(e) => setDraft((d) => ({ ...d, bg_image_url: e.target.value }))}
              placeholder="Background image URL (optional)"
              className="w-full text-sm bg-white/20 text-white placeholder-white/60 border border-white/40 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="bg-white text-indigo-700 font-semibold px-6 py-2 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{config.title}</h1>
            <p className="text-xl text-white/80">{config.description}</p>
          </>
        )}
      </div>
    </header>
  );
}

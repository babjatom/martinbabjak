import { getDb } from './db';

export interface PageConfig {
  title: string;
  description: string;
  bg_image_url: string;
}

export function getConfig(): PageConfig {
  const db = getDb();
  const rows = db.prepare<[], { key: string; value: string }>(
    'SELECT key, value FROM page_config'
  ).all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    title: map['title'] ?? 'Book a Session',
    description: map['description'] ?? 'Pick a time slot that works for you.',
    bg_image_url: map['bg_image_url'] ?? '',
  };
}

export function updateConfig(patch: Partial<PageConfig>): PageConfig {
  const db = getDb();
  const update = db.prepare('UPDATE page_config SET value = ? WHERE key = ?');
  const updateMany = db.transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) update.run(value, key);
    }
  });
  updateMany();
  return getConfig();
}

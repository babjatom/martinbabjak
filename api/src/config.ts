import { getStore } from './store';

export interface PageConfig {
  title: string;
  description: string;
  bg_image_url: string;
}

export function getConfig(): PageConfig {
  const rows = getStore().getConfigRows();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    title: map['title'] ?? 'Book a Session',
    description: map['description'] ?? 'Pick a time slot that works for you.',
    bg_image_url: map['bg_image_url'] ?? '',
  };
}

export function updateConfig(patch: Partial<PageConfig>): PageConfig {
  const store = getStore();
  store.transaction((): void => {
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) store.setConfigValue(key, value);
    }
  });
  return getConfig();
}

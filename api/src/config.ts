import { getStore } from './store-registry';
import { isPostgresStore } from './postgres/PostgresStore';

export interface PageConfig {
  title: string;
  description: string;
  bg_image_url: string;
}

function rowsToConfig(rows: { key: string; value: string }[]): PageConfig {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    title: map['title'] ?? 'Book a Session',
    description: map['description'] ?? 'Pick a time slot that works for you.',
    bg_image_url: map['bg_image_url'] ?? '',
  };
}

export async function getConfig(): Promise<PageConfig> {
  const store = getStore();
  if (!isPostgresStore(store)) {
    throw new Error('PostgresStore required');
  }
  return rowsToConfig(await store.getConfigRowsAsync());
}

export async function updateConfig(patch: Partial<PageConfig>): Promise<PageConfig> {
  const store = getStore();
  if (!isPostgresStore(store)) {
    throw new Error('PostgresStore required');
  }
  await store.transactionAsync(async () => {
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) await store.setConfigValueAsync(key, value);
    }
  });
  return getConfig();
}

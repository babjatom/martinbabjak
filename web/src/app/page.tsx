import BookingPage from '@/components/BookingPage';
import type { PageConfig, Slot } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG: PageConfig = {
  title: 'Book a Session',
  description: 'Pick a time slot that works for you.',
  bg_image_url: '',
};

async function fetchPageData(): Promise<{ config: PageConfig; slots: Slot[] }> {
  const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';
  try {
    const [configRes, slotsRes] = await Promise.all([
      fetch(`${API_URL}/api/config`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/slots`, { cache: 'no-store' }),
    ]);
    const config: PageConfig = configRes.ok
      ? ((await configRes.json()) as { config: PageConfig }).config
      : DEFAULT_CONFIG;
    const slots: Slot[] = slotsRes.ok
      ? ((await slotsRes.json()) as { slots: Slot[] }).slots
      : [];
    return { config, slots };
  } catch {
    return { config: DEFAULT_CONFIG, slots: [] };
  }
}

export default async function Page(): Promise<React.ReactElement> {
  const { config, slots } = await fetchPageData();
  return <BookingPage initialConfig={config} initialSlots={slots} />;
}

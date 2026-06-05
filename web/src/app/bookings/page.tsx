import EditPanel from '@/components/EditPanel';
import { auth } from '@/auth';
import { getServerApiBase } from '@/lib/server-api-base';
import type { PageConfig } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG: PageConfig = {
  title: 'Book a Session',
  description: 'Pick a time slot that works for you.',
  bg_image_url: '',
};

async function fetchPageConfig(): Promise<PageConfig> {
  const API_URL = getServerApiBase();
  try {
    const res = await fetch(`${API_URL}/api/config`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_CONFIG;
    return ((await res.json()) as { config: PageConfig }).config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default async function BookingsPage(): Promise<React.ReactElement> {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const config = await fetchPageConfig();
  return <EditPanel initialConfig={config} adminEmail={email} />;
}

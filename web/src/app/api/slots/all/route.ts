import { handleGetSlotsAll } from '@/lib/booking-api';
import { jsonFromHandler } from '@/lib/api-route';
import { requireAdminResponse } from '@/lib/require-admin';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const denied = await requireAdminResponse();
  if (denied) {
    return denied;
  }
  return jsonFromHandler(() => handleGetSlotsAll());
}

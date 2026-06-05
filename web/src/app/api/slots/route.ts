import { handleGetSlots, handlePostSlots } from '@/lib/booking-api';
import { jsonFromHandler } from '@/lib/api-route';
import { requireAdminResponse } from '@/lib/require-admin';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return jsonFromHandler(() => handleGetSlots());
}

export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdminResponse();
  if (denied) {
    return denied;
  }
  const body: unknown = await request.json();
  return jsonFromHandler(() => handlePostSlots(body));
}

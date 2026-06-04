import { handleGetSlotsAll } from '@/lib/booking-api';
import { jsonFromHandler } from '@/lib/api-route';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return jsonFromHandler(handleGetSlotsAll());
}

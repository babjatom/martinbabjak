import { handleGetSlots, handlePostSlots } from '@/lib/booking-api';
import { jsonFromHandler } from '@/lib/api-route';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return jsonFromHandler(() => handleGetSlots());
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();
  return jsonFromHandler(() => handlePostSlots(body));
}

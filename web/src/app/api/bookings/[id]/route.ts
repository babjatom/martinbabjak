import { handleGetBooking, handleDeleteBooking } from '@/lib/booking-api';
import { jsonFromHandler } from '@/lib/api-route';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  return jsonFromHandler(() => handleGetBooking(id));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  return jsonFromHandler(() => handleDeleteBooking(id));
}

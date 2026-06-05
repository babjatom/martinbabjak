import { handleDeleteSlot } from '@/lib/booking-api';
import { jsonFromHandler } from '@/lib/api-route';
import { requireAdminResponse } from '@/lib/require-admin';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const denied = await requireAdminResponse();
  if (denied) {
    return denied;
  }
  const { id } = await context.params;
  return jsonFromHandler(() => handleDeleteSlot(id));
}

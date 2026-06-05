import { handleGetConfig, handlePutConfig } from '@/lib/booking-api';
import { jsonFromHandler } from '@/lib/api-route';
import { requireAdminResponse } from '@/lib/require-admin';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return jsonFromHandler(() => handleGetConfig());
}

export async function PUT(request: Request): Promise<Response> {
  const denied = await requireAdminResponse();
  if (denied) {
    return denied;
  }
  const body: unknown = await request.json();
  return jsonFromHandler(() => handlePutConfig(body));
}

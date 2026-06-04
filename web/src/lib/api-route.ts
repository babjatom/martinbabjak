import { NextResponse } from 'next/server';
import { initApiStore, internalError, type ApiResponse } from '@/lib/booking-api';

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initApiStore();
    storeReady = true;
  }
}

export async function jsonFromHandler(handler: Promise<ApiResponse>): Promise<NextResponse> {
  try {
    await ensureStore();
    const { status, body } = await handler;
    return NextResponse.json(body, { status });
  } catch (err: unknown) {
    console.error(err);
    const { status, body } = internalError();
    return NextResponse.json(body, { status });
  }
}

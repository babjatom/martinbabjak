import { NextResponse } from 'next/server';
import { initApiStore, internalError, type ApiResponse } from '@/lib/booking-api';

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (storeReady) {
    return;
  }
  await initApiStore();
  storeReady = true;
}

/** Run handler only after the store is ready (do not pass an already-started Promise). */
export async function jsonFromHandler(
  runHandler: () => Promise<ApiResponse>
): Promise<NextResponse> {
  try {
    await ensureStore();
    const { status, body } = await runHandler();
    return NextResponse.json(body, { status });
  } catch (err: unknown) {
    console.error(err);
    const { status, body } = internalError();
    return NextResponse.json(body, { status });
  }
}

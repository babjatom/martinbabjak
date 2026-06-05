import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';

/** Returns 401 response when caller is not an allowlisted admin; otherwise null. */
export async function requireAdminResponse(): Promise<NextResponse | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Admin sign-in required.' },
      { status: 401 },
    );
  }
  return null;
}

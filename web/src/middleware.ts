import { auth } from '@/auth';

export default auth((req) => {
  if (req.auth) {
    return;
  }
  const signIn = new URL('/api/auth/signin', req.nextUrl.origin);
  signIn.searchParams.set('callbackUrl', req.nextUrl.pathname);
  return Response.redirect(signIn);
});

export const config = {
  matcher: ['/bookings', '/bookings/:path*'],
};

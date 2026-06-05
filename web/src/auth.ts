import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAdminEmail } from '@/lib/admin-emails';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ user }): boolean {
      return isAdminEmail(user.email);
    },
    session({ session, token }): typeof session {
      if (session.user !== undefined && typeof token.email === 'string') {
        session.user.email = token.email;
      }
      return session;
    },
  },
});

import type {
  NextAuthOptions,
  DefaultSession,
  User as NextAuthUser,
} from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByEmail } from '../data-access/repositories/userRepo';
import { logger } from '../monitoring/logger';
import * as bcrypt from 'bcryptjs';

type SessionUser = DefaultSession['user'] & { id?: string; roles?: string[] };
interface TokenShape {
  roles?: string[];
  sub?: string;
  [k: string]: unknown;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }
        const user = await findUserByEmail(credentials.email.toLowerCase());
        if (!user || !user.passwordHash) return null;
        const valid = bcrypt.compareSync(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;
        logger.info({ event: 'auth_login', email: user.email });
        return {
          id: user._id,
          email: user.email,
          roles: user.roles,
        } as NextAuthUser & { roles: string[] };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      const t = token as TokenShape;
      const sUser = session.user as SessionUser | undefined;
      if (t.roles && sUser) sUser.roles = t.roles;
      if (t.sub && sUser) sUser.id = t.sub;
      return session;
    },
    async jwt({ token, user }) {
      const t = token as TokenShape;
      if (user) {
        const u = user as NextAuthUser & { roles?: string[] };
        t.roles = u.roles || [];
      }
      return t;
    },
  },
  pages: { signIn: '/login' },
};

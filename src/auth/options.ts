import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { getEnv } from '../config/env';
import { findUserByEmail } from '../data-access/repositories/userRepo';
import { logger } from '../monitoring/logger';
import { callbacks } from './callbacks';
import * as bcrypt from 'bcryptjs';

const env = getEnv();

const providers: NextAuthOptions['providers'] = [
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
      const valid = bcrypt.compareSync(credentials.password, user.passwordHash);
      if (!valid) return null;
      logger.info({
        event: 'auth_login',
        method: 'credentials',
        email: user.email,
      });
      return {
        id: user._id,
        email: user.email,
        roles: user.roles,
      } as NextAuthUser & { roles: string[] };
    },
  }),
];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
      authorization: {
        params: {
          scope: 'openid email profile',
          // Note: Calendar scopes removed - use separate /api/auth/calendar-connect endpoint
        },
      },
    })
  );
}
if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      // Request user email scope so we can retrieve primary verified email if not in profile
      authorization: { params: { scope: 'read:user user:email' } },
      allowDangerousEmailAccountLinking: false,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks,
  pages: { signIn: '/login' },
};

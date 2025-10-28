import type {
  NextAuthOptions,
  DefaultSession,
  User as NextAuthUser,
  Session,
} from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { AdapterUser } from 'next-auth/adapters';

type SessionUser = DefaultSession['user'] & {
  id?: string;
  roles?: string[];
  provider?: string;
};
interface TokenShape {
  roles?: string[];
  sub?: string;
  provider?: string;
  [k: string]: unknown;
}

interface RedirectParams {
  url: string;
  baseUrl: string;
}
interface SessionParams {
  session: Session;
  token: JWT;
  user: AdapterUser;
}
interface JwtParams {
  token: JWT;
  user?: NextAuthUser | AdapterUser;
  account?: ({ provider?: string } & Record<string, unknown>) | null;
}

export const callbacks = {
  async signIn(): Promise<boolean> {
    return true;
  },
  async redirect({ url, baseUrl }: RedirectParams): Promise<string> {
    if (url.startsWith(baseUrl)) return url;
    return baseUrl;
  },
  async session({ session, token }: SessionParams): Promise<Session> {
    const t = token as TokenShape;
    const sUser = session.user as SessionUser | undefined;
    if (t.roles && sUser) sUser.roles = t.roles;
    if (t.sub && sUser) sUser.id = t.sub;
    if (t.provider && sUser) sUser.provider = t.provider;
    return session;
  },
  async jwt({ token, user, account }: JwtParams): Promise<JWT> {
    const t = token as TokenShape;
    if (user) {
      const u = user as NextAuthUser & { roles?: string[] };
      t.roles = u.roles || [];
    }
    if (account && account.provider && account.provider !== 'credentials') {
      t.provider = account.provider;
    }
    return t as JWT;
  },
} satisfies NextAuthOptions['callbacks'];

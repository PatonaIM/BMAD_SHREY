import type {
  NextAuthOptions,
  DefaultSession,
  User as NextAuthUser,
  Session,
  Account,
  Profile,
} from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { AdapterUser } from 'next-auth/adapters';
import { linkOrCreateOAuthUser } from '../services/auth/oauthUserLink';
import { logger } from '../monitoring/logger';

type SessionUser = DefaultSession['user'] & {
  id?: string;
  roles?: string[];
  provider?: string;
};
interface TokenShape {
  roles?: string[];
  sub?: string;
  provider?: string;
  accessToken?: string;
  refreshToken?: string;
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
  async signIn(params: {
    user: NextAuthUser | AdapterUser;
    account: Account | null;
    profile?: Profile | undefined;
  }): Promise<boolean> {
    const { account, profile, user } = params;
    if (!account || !account.provider || account.provider === 'credentials') {
      return true;
    }
    let email = (profile?.email as string | undefined) || undefined;
    const provider = account.provider as 'google' | 'github';
    // GitHub sometimes omits email; fetch via user/emails endpoint if scope granted
    if (provider === 'github' && !email) {
      try {
        // NextAuth Account type does not include access_token in strict mode; augment via indexed access
        const accessToken = (account as unknown as { access_token?: string })
          ?.access_token;

        if (accessToken) {
          const resp = await fetch('https://api.github.com/user/emails', {
            headers: {
              Accept: 'application/vnd.github+json',
              Authorization: `Bearer ${accessToken}`,
              'X-GitHub-Api-Version': '2022-11-28',
            },
          });
          // eslint-disable-next-line no-console
          console.log(resp);
          if (resp.ok) {
            interface GitHubEmailRecord {
              email: string;
              primary: boolean;
              verified: boolean;
              visibility?: string | null;
            }
            const emails = (await resp.json()) as GitHubEmailRecord[];
            const primary =
              emails.find(e => e.primary && e.verified) ||
              emails.find(e => e.primary) ||
              emails[0];
            if (primary?.email) email = primary.email;
          }
        }
      } catch {
        // Silent failure; error path below handles missing email
      }
    }
    const providerId = `${account.provider}:${email ?? 'anon'}`;
    const result = await linkOrCreateOAuthUser({
      email: email ?? null,
      name: (profile?.name as string | undefined) || null,
      provider,
      providerId,
    });
    if ('error' in result) {
      if (result.error === 'missing_email') {
        throw new Error('MissingOAuthEmail');
      }
      logger.error({
        event: 'auth_login_provider_error',
        provider,
        reason: result.error,
      });
      throw new Error('OAuthProviderInternal');
    }
    const userWithExtendedProps = user as NextAuthUser & {
      roles?: string[];
      id?: string;
    };
    userWithExtendedProps.roles = result.roles;
    userWithExtendedProps.id = result.userId;
    return true;
  },
  async redirect({ url, baseUrl }: RedirectParams): Promise<string> {
    // Allow any URL that starts with baseUrl (including callback URLs)
    if (url.startsWith(baseUrl)) return url;
    // Default redirect to base URL
    return baseUrl;
  },
  async session({ session, token }: SessionParams): Promise<Session> {
    const t = token as TokenShape;
    const sUser = session.user as SessionUser | undefined;
    if (t.roles && sUser) sUser.roles = t.roles;
    if (t.sub && sUser) sUser.id = t.sub;
    if (t.provider && sUser) sUser.provider = t.provider;

    // Add Google OAuth tokens to session for Calendar API access
    if (t.accessToken) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = t.accessToken;
    }
    if (t.refreshToken) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).refreshToken = t.refreshToken;
    }

    return session;
  },
  async jwt({ token, user, account }: JwtParams): Promise<JWT> {
    const t = token as TokenShape;
    if (user) {
      const u = user as NextAuthUser & { roles?: string[]; id?: string };
      t.roles = u.roles || [];
      // Set the sub to the user's MongoDB ID for ALL auth methods (credentials + OAuth)
      if (u.id) {
        t.sub = u.id;
      }
    }
    if (account && account.provider && account.provider !== 'credentials') {
      t.provider = account.provider;

      // Store Google OAuth tokens for Calendar API access
      if (account.provider === 'google') {
        if (account.access_token && typeof account.access_token === 'string') {
          t.accessToken = account.access_token;
        }
        if (
          account.refresh_token &&
          typeof account.refresh_token === 'string'
        ) {
          t.refreshToken = account.refresh_token;
        }
      }
    }
    return t as JWT;
  },
} satisfies NextAuthOptions['callbacks'];

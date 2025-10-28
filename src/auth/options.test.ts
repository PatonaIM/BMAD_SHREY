import { describe, it, expect } from 'vitest';
import { callbacks } from './callbacks';
import type { AdapterUser } from 'next-auth/adapters';

interface TestToken {
  roles?: string[];
  sub?: string;
  provider?: string;
  [k: string]: unknown;
}

interface TestAccount {
  provider: string;
}

interface TestSessionUser {
  email: string;
  roles?: string[];
  id?: string;
  provider?: string;
}

describe('authOptions callbacks', () => {
  it('jwt callback assigns provider for oauth', async () => {
    const jwtCb = callbacks.jwt;
    const baseToken: TestToken = {};
    const user: AdapterUser & { roles?: string[] } = {
      id: 'u1',
      email: 'u@example.com',
      roles: ['USER'],
    } as AdapterUser & { roles?: string[] };
    const account: TestAccount = { provider: 'google' };
    // Cast callback to a simplified signature for test isolation
    const out = await (
      jwtCb as unknown as (args: {
        token: TestToken;
        user: AdapterUser;
        account: TestAccount;
      }) => TestToken
    )({
      token: baseToken,
      user,
      account,
    });
    expect(out.provider).toBe('google');
    expect(out.roles).toEqual(['USER']);
  });
  it('session callback propagates roles and provider', async () => {
    const sessionCb = callbacks.session;
    const session: { user: TestSessionUser } = {
      user: { email: 'u@example.com' },
    };
    const token: TestToken = {
      roles: ['ADMIN'],
      sub: 'id-123',
      provider: 'github',
    };
    const out = await (
      sessionCb as unknown as (args: {
        session: { user: TestSessionUser };
        token: TestToken;
        user: AdapterUser;
      }) => { user: TestSessionUser }
    )({
      session,
      token,
      // minimal user to satisfy signature
      user: { id: 'ignored', email: 'ignore@example.com' } as AdapterUser,
    });
    expect(out.user.roles).toEqual(['ADMIN']);
    expect(out.user.id).toBe('id-123');
    expect(out.user.provider).toBe('github');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

function setEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
}

vi.mock('../src/monitoring/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

let users: Array<{ _id: string; email: string; roles: string[] }> = [];
vi.mock('../src/data-access/repositories/userRepo', () => ({
  findUserByEmail: async (email: string) =>
    users.find(u => u.email === email) || null,
  createUser: async ({ email, roles }: { email: string; roles: string[] }) => {
    const existing = users.find(u => u.email === email);
    if (existing) return existing as any;
    const doc = { _id: `id_${users.length}`, email, roles };
    users.push(doc);
    return doc as any;
  },
  anyAdminExists: async () => users.some(u => u.roles.includes('ADMIN')),
  ensureUserEmailUniqueIndex: async () => {},
}));

describe('OAuth linking & role mapping', () => {
  beforeEach(() => {
    users = [];
  });

  it('creates USER role by default', async () => {
    setEnv({ AUTO_ELEVATE_FIRST_OAUTH_ADMIN: 'false' });
    const { linkOrCreateOAuthUser } = await import(
      '../src/services/auth/oauthUserLink.js'
    );
    const res = await linkOrCreateOAuthUser({
      email: 'new@example.com',
      name: 'New',
      provider: 'google',
      providerId: 'g123',
    });
    if ('error' in res) throw new Error('unexpected');
    expect(res.roles).toEqual(['USER']);
    expect(res.newUser).toBe(true);
  });

  it('elevates first user when flag true', async () => {
    setEnv({ AUTO_ELEVATE_FIRST_OAUTH_ADMIN: 'true' });
    const { linkOrCreateOAuthUser } = await import(
      '../src/services/auth/oauthUserLink.js'
    );
    const res = await linkOrCreateOAuthUser({
      email: 'first@example.com',
      name: 'First',
      provider: 'github',
      providerId: 'gh1',
    });
    if ('error' in res) throw new Error('unexpected');
    expect(res.roles).toEqual(['ADMIN']);
    expect(res.elevated).toBe(true);
  });

  it('second user not elevated', async () => {
    setEnv({ AUTO_ELEVATE_FIRST_OAUTH_ADMIN: 'true' });
    const { linkOrCreateOAuthUser } = await import(
      '../src/services/auth/oauthUserLink.js'
    );
    await linkOrCreateOAuthUser({
      email: 'first@example.com',
      name: 'First',
      provider: 'google',
      providerId: 'g1',
    });
    const res2 = await linkOrCreateOAuthUser({
      email: 'second@example.com',
      name: 'Second',
      provider: 'google',
      providerId: 'g2',
    });
    if ('error' in res2) throw new Error('unexpected');
    expect(res2.roles).toEqual(['USER']);
    expect(res2.elevated).toBe(false);
  });

  it('no duplicate on repeated email', async () => {
    setEnv({ AUTO_ELEVATE_FIRST_OAUTH_ADMIN: 'false' });
    const { linkOrCreateOAuthUser } = await import(
      '../src/services/auth/oauthUserLink.js'
    );
    await linkOrCreateOAuthUser({
      email: 'dup@example.com',
      name: 'Dup',
      provider: 'google',
      providerId: 'x1',
    });
    const second = await linkOrCreateOAuthUser({
      email: 'dup@example.com',
      name: 'Dup',
      provider: 'github',
      providerId: 'x2',
    });
    if ('error' in second) throw new Error('unexpected');
    expect(second.newUser).toBe(false);
    expect(users.length).toBe(1);
  });

  it('missing email error path', async () => {
    setEnv({ AUTO_ELEVATE_FIRST_OAUTH_ADMIN: 'false' });
    const { linkOrCreateOAuthUser } = await import(
      '../src/services/auth/oauthUserLink.js'
    );
    const res = await linkOrCreateOAuthUser({
      email: null,
      name: 'NoEmail',
      provider: 'github',
      providerId: 'none',
    });
    expect(res).toEqual({ error: 'missing_email' });
  });

  it('idempotent repeated login', async () => {
    setEnv({ AUTO_ELEVATE_FIRST_OAUTH_ADMIN: 'false' });
    const { linkOrCreateOAuthUser } = await import(
      '../src/services/auth/oauthUserLink.js'
    );
    await linkOrCreateOAuthUser({
      email: 'repeat@example.com',
      name: 'Repeat',
      provider: 'google',
      providerId: 'r1',
    });
    const second = await linkOrCreateOAuthUser({
      email: 'repeat@example.com',
      name: 'Repeat',
      provider: 'google',
      providerId: 'r1',
    });
    if ('error' in second) throw new Error('unexpected');
    expect(second.newUser).toBe(false);
  });

  it('authOptions includes configured oauth providers', async () => {
    setEnv({
      GOOGLE_CLIENT_ID: 'gid',
      GOOGLE_CLIENT_SECRET: 'gsec',
      GITHUB_CLIENT_ID: 'ghid',
      GITHUB_CLIENT_SECRET: 'ghsec',
    });
    const { authOptions } = await import('../src/auth/options.js');
    expect(authOptions.providers.length).toBeGreaterThanOrEqual(3);
  });
});

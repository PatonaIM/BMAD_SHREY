import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkOrCreateOAuthUser } from './oauthUserLink.js';

vi.mock('../../config/env', () => ({
  getEnv: (): { AUTO_ELEVATE_FIRST_OAUTH_ADMIN: boolean } => ({
    AUTO_ELEVATE_FIRST_OAUTH_ADMIN: true,
  }),
}));

interface MockUser {
  email: string;
  roles: string[];
  _id: string;
  createdAt: string;
  updatedAt: string;
}
const users: MockUser[] = [];
let adminExists = false;
vi.mock('../../data-access/repositories/userRepo', () => ({
  findUserByEmail: async (email: string): Promise<MockUser | null> =>
    users.find(u => u.email === email) || null,
  createUser: async (doc: {
    email: string;
    roles: string[];
  }): Promise<MockUser> => {
    const created: MockUser = {
      email: doc.email,
      roles: doc.roles,
      _id: 'id-' + (users.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(created);
    if (created.roles.includes('ADMIN')) adminExists = true;
    return created;
  },
  anyAdminExists: async (): Promise<boolean> => adminExists,
  ensureUserEmailUniqueIndex: async (): Promise<void> => {
    /* no-op for tests */
  },
}));

beforeEach(() => {
  users.length = 0;
  adminExists = false;
});

describe('linkOrCreateOAuthUser', () => {
  it('returns missing_email error when email absent', async () => {
    const res = await linkOrCreateOAuthUser({
      email: null,
      provider: 'google',
      providerId: 'g1',
      name: 'Test',
    });
    expect('error' in res && res.error === 'missing_email').toBe(true);
  });
  it('elevates first user when flag enabled', async () => {
    const res = await linkOrCreateOAuthUser({
      email: 'first@example.com',
      provider: 'google',
      providerId: 'g1',
      name: 'First',
    });
    if (!('error' in res)) {
      expect(res.roles).toContain('ADMIN');
      expect(res.elevated).toBe(true);
    } else {
      throw new Error('Unexpected error result');
    }
  });
  it('second user gets USER role after seed admin pre-exists', async () => {
    // Simulate seed admin existing; first call should create ADMIN, second should be USER
    await linkOrCreateOAuthUser({
      email: 'admin@example.com',
      provider: 'google',
      providerId: 'gSeed',
      name: 'Seed Admin',
    });
    const res = await linkOrCreateOAuthUser({
      email: 'user2@example.com',
      provider: 'google',
      providerId: 'g2',
      name: 'User2',
    });
    if (!('error' in res)) {
      expect(res.roles).toEqual(['USER']);
      expect(res.elevated).toBe(false);
    }
  });
  it('links existing user without creating new', async () => {
    await linkOrCreateOAuthUser({
      email: 'dup@example.com',
      provider: 'google',
      providerId: 'g1',
      name: 'Dup',
    });
    const beforeCount = users.length;
    const res = await linkOrCreateOAuthUser({
      email: 'dup@example.com',
      provider: 'google',
      providerId: 'g1',
      name: 'Dup',
    });
    const afterCount = users.length;
    expect(afterCount).toBe(beforeCount); // no new user
    if (!('error' in res)) {
      expect(res.newUser).toBe(false);
    }
  });
});

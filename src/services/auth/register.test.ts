import { describe, it, expect, vi } from 'vitest';
import { performRegistration } from './register';

vi.mock('../../data-access/repositories/userRepo', () => {
  interface MockUser {
    email: string;
    passwordHash?: string;
    _id?: string;
    createdAt?: string;
    updatedAt?: string;
  }
  const users: MockUser[] = [];
  return {
    findUserByEmail: async (email: string): Promise<MockUser | null> =>
      users.find(u => u.email === email) || null,
    createUser: async (doc: MockUser): Promise<MockUser> => {
      const created: MockUser = {
        ...doc,
        _id: 'id-' + (users.length + 1),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(created);
      return created;
    },
  };
});

describe('performRegistration', () => {
  it('rejects weak password', async () => {
    const res = await performRegistration({
      email: 'test@example.com',
      password: '123',
    });
    expect(res.ok).toBe(false);
  });
  it('creates user', async () => {
    const res = await performRegistration({
      email: 'new@example.com',
      password: 'StrongPass123',
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.userId).toMatch(/^id-/);
  });
  it('prevents duplicate email', async () => {
    await performRegistration({
      email: 'dup@example.com',
      password: 'StrongPass123',
    });
    const res = await performRegistration({
      email: 'dup@example.com',
      password: 'StrongPass123',
    });
    expect(res.ok).toBe(false);
  });
});

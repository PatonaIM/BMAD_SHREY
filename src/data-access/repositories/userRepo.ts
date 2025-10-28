import type { Collection } from 'mongodb';
import { getMongoClient } from '../mongoClient';
import type { User } from '@bmad/shared/types/user';

export interface DbUser extends User {
  passwordHash?: string; // Not exposed to client session
}

async function usersCol(): Promise<Collection<DbUser>> {
  const client = await getMongoClient();
  return client.db().collection<DbUser>('users');
}

export async function ensureUserEmailUniqueIndex(): Promise<void> {
  const col = await usersCol();
  try {
    await col.createIndex(
      { email: 1 },
      { unique: true, name: 'uniq_user_email' }
    );
  } catch (e) {
    // ignore errors (already exists or race)
  }
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const col = await usersCol();
  return col.findOne({ email });
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const col = await usersCol();
  return col.findOne({ _id: id });
}

export async function createUser(
  user: Omit<DbUser, '_id' | 'createdAt' | 'updatedAt'> & {
    passwordHash?: string;
  }
): Promise<DbUser> {
  const col = await usersCol();
  const now = new Date().toISOString();
  const doc: DbUser = {
    ...user,
    _id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

export async function ensureSeedAdmin(): Promise<void> {
  const existing = await findUserByEmail('admin@example.com');
  if (existing) return;
  // Simple seeded admin with password "admin" (hash should be replaced in real setup)
  const bcrypt = await import('bcryptjs');
  const hash = bcrypt.hashSync('admin', 10);
  await createUser({
    email: 'admin@example.com',
    roles: ['ADMIN'],
    passwordHash: hash,
  });
}

export async function anyAdminExists(): Promise<boolean> {
  const col = await usersCol();
  const admin = await col.findOne(
    { roles: { $in: ['ADMIN'] } },
    { projection: { _id: 1 } }
  );
  return !!admin;
}

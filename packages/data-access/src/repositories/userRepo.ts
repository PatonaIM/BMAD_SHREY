import type { Collection } from 'mongodb';
import { getMongoClient } from '../mongoClient';
import type { User } from '@bmad/shared';

async function usersCol(): Promise<Collection<User>> {
  const client = await getMongoClient();
  return client.db().collection<User>('users');
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const col = await usersCol();
  return col.findOne({ email });
}

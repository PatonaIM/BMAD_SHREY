import { MongoClient } from 'mongodb';
import { getEnv } from '@bmad/config';
import { logger } from '@bmad/monitoring';

let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  const { MONGODB_URI } = getEnv();
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  logger.info({ msg: 'MongoDB connected' });
  return client;
}

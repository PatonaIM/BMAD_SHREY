import { MongoClient } from 'mongodb';
import { getEnv } from '../config/env';
import { ensureResumeIndexes } from './repositories/resumeRepo';
import { ensureExtractedProfileIndexes } from './repositories/extractedProfileRepo';
import { logger } from '../monitoring/logger';

let client: MongoClient | null = null;
export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  const { MONGODB_URI } = getEnv();
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  logger.info({ msg: 'MongoDB connected' });
  await ensureIndexes(client);
  return client;
}

async function ensureIndexes(mongo: MongoClient) {
  try {
    const db = mongo.db();
    const jobs = db.collection('jobs');
    await jobs.createIndex(
      { workableId: 1 },
      { unique: true, name: 'uniq_workableId' }
    );
    await jobs.createIndex(
      { status: 1, postedAt: -1 },
      { name: 'status_postedAt' }
    );

    const applications = db.collection('applications');
    await applications.createIndex(
      { userId: 1, jobId: 1 },
      { unique: true, name: 'uniq_user_job' }
    );
    await applications.createIndex(
      { jobId: 1, appliedAt: -1 },
      { name: 'job_appliedAt' }
    );
    await applications.createIndex(
      { userId: 1, appliedAt: -1 },
      { name: 'user_appliedAt' }
    );

    logger.info({ msg: 'Indexes ensured' });
    await ensureResumeIndexes();
    await ensureExtractedProfileIndexes();
  } catch (err) {
    logger.error({
      msg: 'Index creation failed',
      error: (err as Error).message,
    });
  }
}

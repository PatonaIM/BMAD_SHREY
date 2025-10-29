import type { Collection } from 'mongodb';
import { getMongoClient } from '../mongoClient';
import type { ExtractedProfile } from '../../shared/types/profile';

export interface ExtractedProfileDocument extends ExtractedProfile {
  _id: string; // userId
  resumeVersionId: string;
  updatedAt: string;
}

async function col(): Promise<Collection<ExtractedProfileDocument>> {
  const client = await getMongoClient();
  return client.db().collection<ExtractedProfileDocument>('extracted_profiles');
}

export async function ensureExtractedProfileIndexes(): Promise<void> {
  const c = await col();
  try {
    await c.createIndex(
      { _id: 1 },
      { unique: true, name: 'uniq_profile_user' }
    );
    await c.createIndex(
      { resumeVersionId: 1 },
      { name: 'idx_profile_version' }
    );
  } catch {
    // Ignore errors (indexes may already exist)
  }
}

export async function upsertExtractedProfile(
  userId: string,
  resumeVersionId: string,
  profile: ExtractedProfile
): Promise<ExtractedProfileDocument> {
  const c = await col();
  const now = new Date().toISOString();

  const doc: ExtractedProfileDocument = {
    ...profile,
    _id: userId,
    resumeVersionId,
    updatedAt: now,
  };

  await c.replaceOne({ _id: userId }, doc, { upsert: true });
  return doc;
}

export async function getExtractedProfile(
  userId: string
): Promise<ExtractedProfileDocument | null> {
  const c = await col();
  return c.findOne({ _id: userId });
}

export async function deleteExtractedProfile(userId: string): Promise<void> {
  const c = await col();
  await c.deleteOne({ _id: userId });
}

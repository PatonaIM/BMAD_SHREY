import type { Collection } from 'mongodb';
import { getMongoClient } from '../mongoClient';

export interface ResumeVersionMeta {
  versionId: string;
  storedAt: string; // ISO
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  storageKey: string; // path or external key
  sha256: string;
}

export interface ResumeDocument {
  _id: string; // userId
  currentVersionId: string;
  versions: ResumeVersionMeta[]; // append-only
  createdAt: string;
  updatedAt: string;
}

async function col(): Promise<Collection<ResumeDocument>> {
  const client = await getMongoClient();
  return client.db().collection<ResumeDocument>('resumes');
}

export async function ensureResumeIndexes(): Promise<void> {
  const c = await col();
  try {
    await c.createIndex({ _id: 1 }, { unique: true, name: 'uniq_resume_user' });
    await c.createIndex({ currentVersionId: 1 }, { name: 'current_version' });
  } catch {
    // ignore race
  }
}

export async function upsertResumeVersion(
  userId: string,
  meta: Omit<ResumeVersionMeta, 'versionId' | 'storedAt'> & {
    versionId?: string;
    storedAt?: string;
  }
): Promise<ResumeDocument> {
  const c = await col();
  const now = new Date().toISOString();
  const version: ResumeVersionMeta = {
    versionId: meta.versionId || crypto.randomUUID(),
    storedAt: meta.storedAt || now,
    fileName: meta.fileName,
    fileSize: meta.fileSize,
    mimeType: meta.mimeType,
    storageKey: meta.storageKey,
    sha256: meta.sha256,
  };
  const existing = await c.findOne({ _id: userId });
  if (!existing) {
    const doc: ResumeDocument = {
      _id: userId,
      currentVersionId: version.versionId,
      versions: [version],
      createdAt: now,
      updatedAt: now,
    };
    await c.insertOne(doc);
    return doc;
  }
  const updated: ResumeDocument = {
    ...existing,
    currentVersionId: version.versionId,
    versions: [...existing.versions, version],
    updatedAt: now,
  };
  await c.updateOne({ _id: userId }, { $set: updated });
  return updated;
}

export async function getResume(
  userId: string
): Promise<ResumeDocument | null> {
  const c = await col();
  return c.findOne({ _id: userId });
}

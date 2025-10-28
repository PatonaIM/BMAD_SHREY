import type { Collection } from 'mongodb';
import { getMongoClient } from '../mongoClient';
// Use node:crypto when available; for edge (Web Crypto) provide minimal polyfills.
import * as nodeCrypto from 'crypto';

export interface PasswordResetTokenDoc {
  _id: string; // token id (uuid)
  userId: string;
  tokenHash: string; // sha256 hex
  expiresAt: string; // ISO
  consumedAt?: string;
  createdAt: string;
  updatedAt: string;
}

async function col(): Promise<Collection<PasswordResetTokenDoc>> {
  const client = await getMongoClient();
  return client.db().collection<PasswordResetTokenDoc>('password_reset_tokens');
}

function sha256(input: string): string {
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

function genId(): string {
  if (typeof nodeCrypto.randomUUID === 'function') {
    return nodeCrypto.randomUUID();
  }
  const bytes: Buffer = nodeCrypto.randomBytes(16);
  // RFC4122 adjustments
  if (bytes.length > 8) {
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
  }
  const hex = bytes.toString('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}

export async function createPasswordResetToken(
  userId: string,
  ttlMinutes: number
): Promise<{ rawToken: string; doc: PasswordResetTokenDoc }> {
  const c = await col();
  const rawToken = genId() + genId().replace(/-/g, '');
  const tokenHash = sha256(rawToken);
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMinutes * 60_000);
  const doc: PasswordResetTokenDoc = {
    _id: genId(),
    userId,
    tokenHash,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await c.insertOne(doc);
  return { rawToken, doc };
}

export async function findValidResetToken(
  rawToken: string
): Promise<PasswordResetTokenDoc | null> {
  const c = await col();
  const tokenHash = sha256(rawToken);
  const doc = await c.findOne({ tokenHash });
  if (!doc) return null;
  if (doc.consumedAt) return null;
  if (new Date(doc.expiresAt).getTime() < Date.now()) return null;
  return doc;
}

export async function consumeResetToken(rawToken: string): Promise<boolean> {
  const c = await col();
  const tokenHash = sha256(rawToken);
  const res = await c.updateOne(
    { tokenHash, consumedAt: { $exists: false } },
    {
      $set: {
        consumedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  );
  return res.modifiedCount > 0;
}

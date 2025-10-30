import { Collection, IndexDescription, Sort } from 'mongodb';
import { getMongoClient } from '../mongoClient';
import type {
  ProfileVersion,
  ListProfileVersionsQuery,
  ProfileDiff,
} from '../../shared/types/profileEditing';
import { ok, err, type Result } from '../../shared/result';

// Mongo document extends version with internal _id
interface ProfileVersionDocument extends ProfileVersion {
  _id?: string;
}

async function col(): Promise<Collection<ProfileVersionDocument>> {
  const client = await getMongoClient();
  return client.db().collection<ProfileVersionDocument>('profile_versions');
}

export async function ensureProfileVersionIndexes(): Promise<void> {
  const c = await col();
  const indexes: IndexDescription[] = [
    { key: { userId: 1, createdAt: -1 }, name: 'user_createdAt_desc' },
    { key: { id: 1 }, unique: true, name: 'version_id_unique' },
  ];
  for (const idx of indexes) {
    try {
      await c.createIndex(idx.key, idx);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('ensureProfileVersionIndexes error', e);
    }
  }
}

export async function insertProfileVersion(
  version: ProfileVersion
): Promise<Result<ProfileVersion>> {
  try {
    const c = await col();
    await c.insertOne({ ...version });
    return ok(version);
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Failed to insert profile version';
    return err('INSERT_FAILED', message);
  }
}

export async function getProfileVersion(
  userId: string,
  versionId: string
): Promise<Result<ProfileVersion>> {
  try {
    const c = await col();
    const doc = await c.findOne({ userId, id: versionId });
    if (!doc) return err('NOT_FOUND', 'Profile version not found');
    // strip internal _id (discard)
    const rest = { ...doc } as ProfileVersion;
    // @ts-expect-error remove internal field
    delete rest._id;
    return ok(rest);
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Failed to fetch profile version';
    return err('FETCH_FAILED', message);
  }
}

export async function listProfileVersions(
  query: ListProfileVersionsQuery
): Promise<Result<ProfileVersion[]>> {
  const { userId, limit = 25, beforeId } = query;
  try {
    const c = await col();
    const findQuery: Record<string, unknown> = { userId };
    if (beforeId) {
      const pivot = await c.findOne({ userId, id: beforeId });
      if (pivot) findQuery.createdAt = { $lt: pivot.createdAt };
    }
    const docs = await c
      .find(findQuery)
      .sort({ createdAt: -1 } satisfies Sort)
      .limit(limit)
      .toArray();
    return ok(
      docs.map(d => {
        const rest = { ...d } as ProfileVersion;
        // @ts-expect-error remove internal field
        delete rest._id;
        return rest;
      })
    );
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Failed to list profile versions';
    return err('LIST_FAILED', message);
  }
}

export async function updateProfileVersionDiff(
  userId: string,
  versionId: string,
  diff: ProfileDiff
): Promise<Result<ProfileVersion>> {
  try {
    const c = await col();
    const res = await c.findOneAndUpdate(
      { userId, id: versionId },
      { $set: { diff } },
      { returnDocument: 'after' }
    );
    if (!res) return err('NOT_FOUND', 'Version not found for diff update');
    // findOneAndUpdate returns Document | null under driver v6 when no options requesting value wrapper
    if (!res) return err('NOT_FOUND', 'Version not found for diff update');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const doc = res as ProfileVersionDocument;
    const rest = { ...doc } as ProfileVersion;
    // @ts-expect-error remove internal field
    delete rest._id;
    return ok(rest);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update diff';
    return err('DIFF_UPDATE_FAILED', message);
  }
}

export async function deleteProfileVersion(
  userId: string,
  versionId: string
): Promise<Result<boolean>> {
  try {
    const c = await col();
    const res = await c.deleteOne({ userId, id: versionId });
    if (res.deletedCount === 0)
      return err('NOT_FOUND', 'Version not found to delete');
    return ok(true);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to delete version';
    return err('DELETE_FAILED', message);
  }
}

// Utility to trim stored versions if too many (retention policy)
export async function enforceVersionRetention(
  userId: string,
  maxVersions = 100
): Promise<Result<number>> {
  try {
    const c = await col();
    const count = await c.countDocuments({ userId });
    if (count <= maxVersions) return ok(0);
    const excess = count - maxVersions;
    const oldDocs = await c
      .find({ userId })
      .sort({ createdAt: 1 })
      .limit(excess)
      .toArray();
    const idsToDelete = oldDocs.map(d => d.id);
    await c.deleteMany({ userId, id: { $in: idsToDelete } });
    return ok(excess);
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Failed to enforce version retention';
    return err('RETENTION_FAILED', message);
  }
}

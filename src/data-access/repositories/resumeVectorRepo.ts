import type { Collection } from 'mongodb';
import { getMongoClient } from '../mongoClient';
import type {
  ResumeVector,
  VectorSearchQuery,
} from '../../shared/types/vector';
import { ok, err, type Result } from '../../shared/result';

export interface ResumeVectorDocument
  extends Omit<ResumeVector, 'createdAt' | 'updatedAt'> {
  _id: string; // profileId
  createdAt: string;
  updatedAt: string;
}

async function col(): Promise<Collection<ResumeVectorDocument>> {
  const client = await getMongoClient();
  return client.db().collection<ResumeVectorDocument>('resume_vectors');
}

export async function ensureResumeVectorIndexes(): Promise<void> {
  const c = await col();
  try {
    await c.createIndex(
      { _id: 1 },
      { unique: true, name: 'uniq_profile_vector' }
    );
    await c.createIndex({ userId: 1 }, { name: 'idx_user_vectors' });
    await c.createIndex({ updatedAt: -1 }, { name: 'idx_vectors_updated' });

    // Note: Vector search indexes need to be created manually in MongoDB Atlas
    // This is just a placeholder for regular indexes
  } catch {
    // Ignore errors (indexes may already exist)
  }
}

export class ResumeVectorRepository {
  async upsert(
    vector: ResumeVector
  ): Promise<Result<ResumeVectorDocument, 'database_error'>> {
    try {
      const c = await col();
      const now = new Date().toISOString();

      const doc: ResumeVectorDocument = {
        ...vector,
        _id: vector.profileId,
        createdAt: vector.createdAt.toISOString(),
        updatedAt: now,
      };

      await c.replaceOne({ _id: vector.profileId }, doc, { upsert: true });
      return ok(doc);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err('database_error', `Failed to upsert vector: ${message}`);
    }
  }

  async getByProfileId(
    profileId: string
  ): Promise<ResumeVectorDocument | null> {
    try {
      const c = await col();
      const doc = await c.findOne({ _id: profileId });
      return doc;
    } catch {
      return null;
    }
  }

  async getByUserId(userId: string): Promise<ResumeVectorDocument[]> {
    try {
      const c = await col();
      const docs = await c.find({ userId }).toArray();
      return docs;
    } catch {
      return [];
    }
  }

  async deleteByProfileId(profileId: string): Promise<void> {
    const c = await col();
    await c.deleteOne({ _id: profileId });
  }

  async deleteByUserId(userId: string): Promise<void> {
    const c = await col();
    await c.deleteMany({ userId });
  }

  async vectorSearch(
    query: VectorSearchQuery
  ): Promise<Array<{ userId: string; score: number }>> {
    try {
      const c = await col();

      // MongoDB Atlas Vector Search aggregation pipeline
      const pipeline = [
        {
          $vectorSearch: {
            queryVector: query.vector,
            path: 'embeddings',
            numCandidates: (query.limit || 10) * 10, // Search more candidates than limit
            limit: query.limit || 10,
            index: 'vector_index',
            ...(query.filter && { filter: query.filter }),
          },
        },
        {
          $project: {
            userId: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const results = await c.aggregate(pipeline).toArray();
      return results.map(doc => ({
        userId: doc.userId,
        score: doc.score,
      }));
    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  async getStats(): Promise<{
    totalVectors: number;
    averageDimensions: number;
    latestModel: string;
    oldestVector: Date | null;
    newestVector: Date | null;
  }> {
    try {
      const c = await col();

      const [stats] = await c
        .aggregate([
          {
            $group: {
              _id: null,
              totalVectors: { $sum: 1 },
              avgDimensions: { $avg: '$dimensions' },
              oldestCreated: { $min: '$createdAt' },
              newestCreated: { $max: '$createdAt' },
              latestModel: { $last: '$model' },
            },
          },
        ])
        .toArray();

      if (!stats) {
        return {
          totalVectors: 0,
          averageDimensions: 0,
          latestModel: 'none',
          oldestVector: null,
          newestVector: null,
        };
      }

      return {
        totalVectors: stats.totalVectors,
        averageDimensions: Math.round(stats.avgDimensions || 0),
        latestModel: stats.latestModel || 'none',
        oldestVector: stats.oldestCreated
          ? new Date(stats.oldestCreated)
          : null,
        newestVector: stats.newestCreated
          ? new Date(stats.newestCreated)
          : null,
      };
    } catch {
      return {
        totalVectors: 0,
        averageDimensions: 0,
        latestModel: 'none',
        oldestVector: null,
        newestVector: null,
      };
    }
  }
}

export const resumeVectorRepo = new ResumeVectorRepository();

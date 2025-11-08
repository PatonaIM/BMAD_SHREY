import { getMongoClient } from '../mongoClient';
import type { JobVector } from '../../services/ai/jobVectorization';
import { ObjectId } from 'mongodb';

export class JobVectorRepository {
  private async getCollection() {
    const client = await getMongoClient();
    return client.db().collection<JobVector>('jobVectors');
  }

  /**
   * Create a new job vector
   */
  async create(vector: Omit<JobVector, '_id'>): Promise<JobVector> {
    const collection = await this.getCollection();
    const result = await collection.insertOne(vector as JobVector);
    return { ...vector, _id: result.insertedId.toString() } as JobVector;
  }

  /**
   * Get job vector by job ID
   */
  async getByJobId(jobId: string): Promise<JobVector | null> {
    const collection = await this.getCollection();

    // Try with string ID first
    let vector = await collection.findOne({ jobId });

    // If not found and looks like ObjectId, try with ObjectId
    if (!vector && jobId.length === 24 && /^[0-9a-fA-F]{24}$/.test(jobId)) {
      vector = await collection.findOne({
        jobId: new ObjectId(jobId).toString(),
      });
    }

    return vector;
  }

  /**
   * Update an existing job vector
   */
  async update(
    jobId: string,
    updates: Partial<Omit<JobVector, '_id' | 'jobId'>>
  ): Promise<JobVector | null> {
    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { jobId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  /**
   * Delete job vector by job ID
   */
  async deleteByJobId(jobId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ jobId });
    return result.deletedCount > 0;
  }

  /**
   * Get all job vectors (for migration/admin)
   */
  async getAll(limit = 1000): Promise<JobVector[]> {
    const collection = await this.getCollection();
    return collection.find().limit(limit).toArray();
  }

  /**
   * Get statistics about job vectors
   */
  async getStats(): Promise<{
    totalVectors: number;
    oldVersionCount: number;
  }> {
    const collection = await this.getCollection();

    const totalVectors = await collection.countDocuments();

    // Count vectors with old versions (version < 1)
    const oldVersionCount = await collection.countDocuments({
      version: { $lt: 1 },
    });

    return {
      totalVectors,
      oldVersionCount,
    };
  }

  /**
   * Find jobs without vectors
   */
  async findJobsWithoutVectors(limit = 100): Promise<string[]> {
    const client = await getMongoClient();
    const db = client.db();
    const jobs = db.collection('jobs');
    const jobVectors = db.collection<JobVector>('jobVectors');

    // Get all active job IDs
    const activeJobs = await jobs
      .find({ status: 'active' }, { projection: { _id: 1 } })
      .limit(limit * 2) // Get more than needed
      .toArray();

    const activeJobIds = activeJobs.map(j => j._id.toString());

    // Get all vectorized job IDs
    const vectorizedJobs = await jobVectors
      .find({}, { projection: { jobId: 1 } })
      .toArray();

    const vectorizedJobIds = new Set(vectorizedJobs.map(v => v.jobId));

    // Find jobs without vectors
    const jobsWithoutVectors = activeJobIds.filter(
      jobId => !vectorizedJobIds.has(jobId)
    );

    return jobsWithoutVectors.slice(0, limit);
  }
}

export const jobVectorRepo = new JobVectorRepository();

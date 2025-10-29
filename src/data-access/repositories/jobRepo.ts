import { getMongoClient } from '../mongoClient';
import { Job, JobSearchParams } from '../../shared/types/job';
import type { Collection, Filter } from 'mongodb';

export class JobRepository {
  private async getCollection(): Promise<Collection<Job>> {
    const client = await getMongoClient();
    return client.db().collection<Job>('jobs');
  }

  /**
   * Find a job by its Workable ID
   */
  async findByWorkableId(workableId: string): Promise<Job | null> {
    const collection = await this.getCollection();
    return collection.findOne({ workableId });
  }

  /**
   * Find a job by MongoDB ID
   */
  async findById(id: string): Promise<Job | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: id } as Filter<Job>);
  }

  /**
   * Create a new job
   */
  async create(
    jobData: Omit<Job, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<Job> {
    const collection = await this.getCollection();
    const now = new Date();
    const job: Omit<Job, '_id'> = {
      ...jobData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(job as Job);
    return { ...job, _id: result.insertedId.toString() } as Job;
  }

  /**
   * Update an existing job
   */
  async update(workableId: string, updates: Partial<Job>): Promise<Job | null> {
    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { workableId },
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
   * Archive jobs (mark as inactive)
   */
  async archive(workableIds: string[]): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.updateMany(
      { workableId: { $in: workableIds } },
      {
        $set: {
          status: 'archived',
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount;
  }

  /**
   * Search jobs with filters
   */
  async search(
    params: JobSearchParams
  ): Promise<{ jobs: Job[]; total: number }> {
    const collection = await this.getCollection();
    const {
      keyword,
      location,
      experienceLevel,
      employmentType,
      page = 1,
      limit = 20,
    } = params;

    const filter: Filter<Job> = { status: 'active' };

    // Keyword search (title or description)
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    // Location filter
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    // Experience level filter
    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    // Employment type filter
    if (employmentType) {
      filter.employmentType = employmentType;
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return { jobs, total };
  }

  /**
   * Get all active jobs (for homepage)
   */
  async findActive(limit = 20): Promise<Job[]> {
    const collection = await this.getCollection();
    return collection
      .find({ status: 'active' })
      .sort({ postedAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    const collection = await this.getCollection();
    const job = await collection
      .find()
      .sort({ lastSyncedAt: -1 })
      .limit(1)
      .toArray();

    return job[0]?.lastSyncedAt || null;
  }
}

export const jobRepo = new JobRepository();

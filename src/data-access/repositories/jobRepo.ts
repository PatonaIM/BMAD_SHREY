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
    // eslint-disable-next-line no-console
    console.log('Finding job by ID:', id);

    // Try finding by string ID first
    let job = await collection.findOne({ _id: id } as Filter<Job>);
    // If not found and the ID looks like a MongoDB ObjectId, try with ObjectId
    if (!job && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      const { ObjectId } = await import('mongodb');
      job = await collection.findOne({
        _id: new ObjectId(id),
      } as unknown as Filter<Job>);
    }
    // eslint-disable-next-line no-console
    console.log(
      'Job found:',
      job ? { _id: job._id, title: job.title } : 'null'
    );
    return job;
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
    // eslint-disable-next-line no-console
    console.log(
      'Created job with ObjectId:',
      result.insertedId,
      'as string:',
      result.insertedId.toString()
    );
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
   * Upsert a job by workableId. Returns the job and a flag indicating if it was created or updated.
   */
  async upsertByWorkableId(
    workableId: string,
    data: Omit<Job, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ job: Job; created: boolean; updatedFields: string[] }> {
    const collection = await this.getCollection();
    const existing = await collection.findOne({ workableId });
    const now = new Date();
    if (!existing) {
      const insertDoc: Omit<Job, '_id'> = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      const result = await collection.insertOne(insertDoc as Job);
      // eslint-disable-next-line no-console
      console.log(
        'Upserted new job with ObjectId:',
        result.insertedId,
        'as string:',
        result.insertedId.toString()
      );
      return {
        job: { ...insertDoc, _id: result.insertedId.toString() } as Job,
        created: true,
        updatedFields: Object.keys(data),
      };
    }
    // Determine changed fields (shallow compare for primitive & string fields)
    const changed: string[] = [];
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (key === 'lastSyncedAt') continue; // always changes
      if (JSON.stringify(existing[key]) !== JSON.stringify(data[key])) {
        changed.push(key as string);
      }
    }
    if (changed.length === 0) {
      return {
        job: existing as Job,
        created: false,
        updatedFields: [],
      };
    }
    const updateDoc = {
      $set: { ...data, updatedAt: now },
    };
    const updated = await collection.findOneAndUpdate(
      { workableId },
      updateDoc,
      { returnDocument: 'after' }
    );
    return {
      job: updated as Job,
      created: false,
      updatedFields: changed,
    };
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

  /**
   * Find jobs that likely need hydration (short description, missing requirements, or empty skills) and have a shortcode.
   */
  async findNeedingHydration(limit = 50): Promise<Job[]> {
    const collection = await this.getCollection();
    return collection
      .find({
        workableShortcode: { $exists: true, $type: 'string' },
        status: 'active',
        $or: [
          { description: { $exists: false } },
          { description: { $type: 'string', $regex: /^.{0,60}$/ } },
          { requirements: { $exists: false } },
          { skills: { $size: 0 } },
        ],
      })
      .limit(limit)
      .toArray();
  }
}

export const jobRepo = new JobRepository();

import { getMongoClient } from '../mongoClient';
import { ObjectId } from 'mongodb';
import { logger } from '../../monitoring/logger';

export interface JobSubscription {
  _id: ObjectId;
  jobId: ObjectId;
  recruiterId: string; // UUID from users collection
  subscribedAt: Date;
  isActive: boolean;
  notificationsEnabled: boolean;
}

export interface CreateSubscriptionInput {
  jobId: string;
  recruiterId: string;
  notificationsEnabled?: boolean;
}

export interface SubscriptionWithJobData
  extends Omit<JobSubscription, 'jobId'> {
  jobId: string; // Converted to string for frontend use
  jobTitle?: string;
  companyName?: string;
  location?: string;
  postedAt?: Date;
  applicationCount?: number;
}

/**
 * Ensure indexes for recruiterSubscriptions collection
 */
export async function ensureRecruiterSubscriptionIndexes(): Promise<void> {
  try {
    const client = await getMongoClient();
    const db = client.db();
    const subscriptions = db.collection<JobSubscription>(
      'recruiterSubscriptions'
    );

    // Composite index for fast lookups (unique subscription per recruiter per job)
    await subscriptions.createIndex(
      { jobId: 1, recruiterId: 1 },
      { unique: true, name: 'uniq_job_recruiter' }
    );

    // Index for filtering by active status and recruiter
    await subscriptions.createIndex(
      { recruiterId: 1, isActive: 1 },
      { name: 'recruiter_active' }
    );

    // Index for job-based queries
    await subscriptions.createIndex(
      { jobId: 1, isActive: 1 },
      { name: 'job_active' }
    );

    logger.info({ msg: 'RecruiterSubscription indexes ensured' });
  } catch (err) {
    logger.error({
      msg: 'RecruiterSubscription index creation failed',
      error: (err as Error).message,
    });
  }
}

/**
 * Create a new job subscription for a recruiter
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<JobSubscription> {
  const client = await getMongoClient();
  const db = client.db();
  const subscriptions = db.collection<JobSubscription>(
    'recruiterSubscriptions'
  );

  // Validate ObjectId formats
  if (!ObjectId.isValid(input.jobId)) {
    throw new Error(`Invalid jobId format: ${input.jobId}`);
  }

  const subscription: Omit<JobSubscription, '_id'> = {
    jobId: new ObjectId(input.jobId),
    recruiterId: input.recruiterId, // UUID string, not ObjectId
    subscribedAt: new Date(),
    isActive: true,
    notificationsEnabled: input.notificationsEnabled ?? true,
  };

  try {
    const result = await subscriptions.insertOne(
      subscription as JobSubscription
    );
    logger.info({
      msg: 'Subscription created',
      jobId: input.jobId,
      recruiterId: input.recruiterId,
    });

    return {
      _id: result.insertedId,
      ...subscription,
    } as JobSubscription;
  } catch (err) {
    // Handle duplicate key error gracefully
    if ((err as Error & { code?: number }).code === 11000) {
      logger.warn({
        msg: 'Subscription already exists, reactivating',
        jobId: input.jobId,
        recruiterId: input.recruiterId,
      });
      // Reactivate existing subscription
      const updated = await subscriptions.findOneAndUpdate(
        {
          jobId: new ObjectId(input.jobId),
          recruiterId: input.recruiterId, // UUID string
        },
        {
          $set: {
            isActive: true,
            notificationsEnabled: input.notificationsEnabled ?? true,
          },
        },
        { returnDocument: 'after' }
      );
      if (!updated) {
        throw new Error('Failed to reactivate subscription');
      }
      return updated as JobSubscription;
    }
    throw err;
  }
}

/**
 * Unsubscribe a recruiter from a job (soft delete)
 */
export async function deleteSubscription(
  jobId: string,
  recruiterId: string
): Promise<boolean> {
  const client = await getMongoClient();
  const db = client.db();
  const subscriptions = db.collection<JobSubscription>(
    'recruiterSubscriptions'
  );

  const result = await subscriptions.updateOne(
    {
      jobId: new ObjectId(jobId),
      recruiterId: recruiterId, // UUID string
    },
    {
      $set: { isActive: false },
    }
  );

  logger.info({
    msg: 'Subscription deleted',
    jobId,
    recruiterId,
    modified: result.modifiedCount,
  });

  return result.modifiedCount > 0;
}

/**
 * Get all active subscriptions for a recruiter with job details
 */
export async function findActiveSubscriptionsByRecruiter(
  recruiterId: string
): Promise<SubscriptionWithJobData[]> {
  const client = await getMongoClient();
  const db = client.db();
  const subscriptions = db.collection<JobSubscription>(
    'recruiterSubscriptions'
  );

  // recruiterId is a UUID string, no validation needed
  const pipeline = [
    {
      $match: {
        recruiterId: recruiterId, // UUID string, not ObjectId
        isActive: true,
      },
    },
    {
      $lookup: {
        from: 'jobs',
        localField: 'jobId',
        foreignField: '_id',
        as: 'jobData',
      },
    },
    {
      $unwind: '$jobData',
    },
    {
      $addFields: {
        jobIdString: { $toString: '$jobId' },
      },
    },
    {
      $lookup: {
        from: 'applications',
        localField: 'jobIdString',
        foreignField: 'jobId',
        as: 'applications',
      },
    },
    {
      $project: {
        _id: 1,
        jobId: { $toString: '$jobId' }, // Convert ObjectId to string for frontend
        recruiterId: 1,
        subscribedAt: 1,
        isActive: 1,
        notificationsEnabled: 1,
        jobTitle: '$jobData.title',
        companyName: '$jobData.companyName',
        location: '$jobData.location',
        postedAt: '$jobData.postedAt',
        applicationCount: { $size: '$applications' },
      },
    },
    {
      $sort: { subscribedAt: -1 },
    },
  ];

  const results = await subscriptions.aggregate(pipeline).toArray();
  return results as SubscriptionWithJobData[];
}

/**
 * Check if a recruiter is subscribed to a specific job
 */
export async function isSubscribed(
  jobId: string,
  recruiterId: string
): Promise<boolean> {
  const client = await getMongoClient();
  const db = client.db();
  const subscriptions = db.collection<JobSubscription>(
    'recruiterSubscriptions'
  );

  // Validate jobId format only
  if (!ObjectId.isValid(jobId)) {
    logger.warn({
      msg: 'Invalid jobId format in isSubscribed',
      jobId,
      recruiterId,
    });
    return false;
  }

  const subscription = await subscriptions.findOne({
    jobId: new ObjectId(jobId),
    recruiterId: recruiterId, // UUID string
    isActive: true,
  });

  return subscription !== null;
}

/**
 * Get subscription count for a specific job
 */
export async function getSubscriptionCount(jobId: string): Promise<number> {
  const client = await getMongoClient();
  const db = client.db();
  const subscriptions = db.collection<JobSubscription>(
    'recruiterSubscriptions'
  );

  return subscriptions.countDocuments({
    jobId: new ObjectId(jobId),
    isActive: true,
  });
}

/**
 * Get list of recruiter IDs subscribed to a job
 */
export async function getSubscribedRecruiters(
  jobId: string
): Promise<string[]> {
  const client = await getMongoClient();
  const db = client.db();
  const subscriptions = db.collection<JobSubscription>(
    'recruiterSubscriptions'
  );

  const results = await subscriptions
    .find(
      {
        jobId: new ObjectId(jobId),
        isActive: true,
      },
      {
        projection: { recruiterId: 1 },
      }
    )
    .toArray();

  return results.map(r => r.recruiterId); // UUID strings
}

export const recruiterSubscriptionRepo = {
  createSubscription,
  deleteSubscription,
  findActiveSubscriptionsByRecruiter,
  isSubscribed,
  getSubscriptionCount,
  getSubscribedRecruiters,
  ensureRecruiterSubscriptionIndexes,
};

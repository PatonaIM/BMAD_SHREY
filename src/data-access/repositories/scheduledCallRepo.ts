import { getMongoClient } from '../mongoClient';
import { ObjectId } from 'mongodb';
import { logger } from '../../monitoring/logger';

export interface ScheduledCall {
  _id: ObjectId;
  applicationId: string; // UUID - matches Application._id
  recruiterId: string; // UUID
  candidateEmail: string;
  jobId: string; // UUID - matches Job._id
  scheduledAt: Date;
  duration: number; // minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  googleCalendarEventId?: string;
  meetLink?: string;
  notes?: string;
  geminiTranscript?: {
    status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';
    transcript?: string;
    summary?: string;
    processedAt?: Date;
    error?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduledCallInput {
  applicationId: string;
  recruiterId: string;
  candidateEmail: string;
  jobId: string;
  scheduledAt: Date;
  duration?: number;
  notes?: string;
  googleCalendarEventId?: string;
  meetLink?: string;
}

/**
 * Ensure indexes for scheduledCalls collection
 */
export async function ensureScheduledCallIndexes(): Promise<void> {
  try {
    const client = await getMongoClient();
    const db = client.db();
    const calls = db.collection<ScheduledCall>('scheduledCalls');

    // Index for fetching recruiter's scheduled calls
    await calls.createIndex(
      { recruiterId: 1, scheduledAt: -1 },
      { name: 'recruiter_schedule' }
    );

    // Index for fetching application's calls
    await calls.createIndex(
      { applicationId: 1, createdAt: -1 },
      { name: 'application_calls' }
    );

    // Index for finding upcoming calls
    await calls.createIndex(
      { scheduledAt: 1, status: 1 },
      { name: 'upcoming_calls' }
    );

    logger.info({ msg: 'ScheduledCall indexes ensured' });
  } catch (err) {
    logger.error({
      msg: 'ScheduledCall index creation failed',
      error: (err as Error).message,
    });
  }
}

/**
 * Create a new scheduled call
 */
export async function createScheduledCall(
  input: CreateScheduledCallInput
): Promise<ScheduledCall> {
  const client = await getMongoClient();
  const db = client.db();
  const calls = db.collection<ScheduledCall>('scheduledCalls');

  const call: Omit<ScheduledCall, '_id'> = {
    applicationId: input.applicationId,
    recruiterId: input.recruiterId,
    candidateEmail: input.candidateEmail,
    jobId: input.jobId,
    scheduledAt: input.scheduledAt,
    duration: input.duration || 30,
    status: 'scheduled',
    googleCalendarEventId: input.googleCalendarEventId,
    meetLink: input.meetLink,
    notes: input.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await calls.insertOne(call as ScheduledCall);

  logger.info({
    msg: 'Scheduled call created',
    callId: result.insertedId,
    applicationId: input.applicationId,
    scheduledAt: input.scheduledAt,
  });

  return {
    _id: result.insertedId,
    ...call,
  } as ScheduledCall;
}

/**
 * Get scheduled calls for a recruiter
 */
export async function findScheduledCallsByRecruiter(
  recruiterId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    status?: ScheduledCall['status'];
  }
): Promise<ScheduledCall[]> {
  const client = await getMongoClient();
  const db = client.db();
  const calls = db.collection<ScheduledCall>('scheduledCalls');

  const filter: Record<string, unknown> = { recruiterId };

  if (options?.startDate || options?.endDate) {
    filter.scheduledAt = {};
    if (options.startDate) {
      (filter.scheduledAt as Record<string, unknown>).$gte = options.startDate;
    }
    if (options?.endDate) {
      (filter.scheduledAt as Record<string, unknown>).$lte = options.endDate;
    }
  }

  if (options?.status) {
    filter.status = options.status;
  }

  const results = await calls.find(filter).sort({ scheduledAt: 1 }).toArray();

  return results;
}

/**
 * Get scheduled calls for an application
 */
export async function findScheduledCallsByApplication(
  applicationId: string
): Promise<ScheduledCall[]> {
  const client = await getMongoClient();
  const db = client.db();
  const calls = db.collection<ScheduledCall>('scheduledCalls');

  const results = await calls
    .find({ applicationId: applicationId })
    .sort({ createdAt: -1 })
    .toArray();

  return results;
}

/**
 * Update call status
 */
export async function updateCallStatus(
  callId: string,
  status: ScheduledCall['status'],
  notes?: string
): Promise<boolean> {
  const client = await getMongoClient();
  const db = client.db();
  const calls = db.collection<ScheduledCall>('scheduledCalls');

  const result = await calls.updateOne(
    { _id: new ObjectId(callId) },
    {
      $set: {
        status,
        ...(notes && { notes }),
        updatedAt: new Date(),
      },
    }
  );

  logger.info({
    msg: 'Call status updated',
    callId,
    status,
  });

  return result.modifiedCount > 0;
}

/**
 * Find a scheduled call by ID
 */
export async function findScheduledCallById(
  callId: string
): Promise<ScheduledCall | null> {
  const client = await getMongoClient();
  const db = client.db();
  const calls = db.collection<ScheduledCall>('scheduledCalls');

  return calls.findOne({ _id: new ObjectId(callId) });
}

export const scheduledCallRepo = {
  createScheduledCall,
  findScheduledCallsByRecruiter,
  findScheduledCallsByApplication,
  updateCallStatus,
  findScheduledCallById,
  ensureScheduledCallIndexes,
};

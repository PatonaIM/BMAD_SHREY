import { getMongoClient } from '../mongoClient';
import { ObjectId } from 'mongodb';
import { logger } from '../../monitoring/logger';

export type InvitationStatus = 'sent' | 'viewed' | 'applied' | 'declined';

export interface CandidateInvitation {
  _id: ObjectId;
  jobId: ObjectId;
  candidateId: ObjectId;
  recruiterId: ObjectId;
  message: string;
  status: InvitationStatus;
  sentAt: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationInput {
  jobId: string;
  candidateId: string;
  recruiterId: string;
  message: string;
}

export interface InvitationWithDetails extends CandidateInvitation {
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  companyName?: string;
}

/**
 * Ensure indexes for candidateInvitations collection
 */
export async function ensureCandidateInvitationIndexes(): Promise<void> {
  try {
    const client = await getMongoClient();
    const db = client.db();
    const invitations = db.collection<CandidateInvitation>(
      'candidateInvitations'
    );

    // Composite index for checking if candidate was already invited
    await invitations.createIndex(
      { jobId: 1, candidateId: 1 },
      { unique: true, name: 'uniq_job_candidate' }
    );

    // Index for filtering by recruiter
    await invitations.createIndex(
      { recruiterId: 1, sentAt: -1 },
      { name: 'recruiter_sent' }
    );

    // Index for filtering by status
    await invitations.createIndex(
      { status: 1, sentAt: -1 },
      { name: 'status_sent' }
    );

    // Index for candidate's invitations
    await invitations.createIndex(
      { candidateId: 1, sentAt: -1 },
      { name: 'candidate_sent' }
    );

    logger.info({ msg: 'CandidateInvitation indexes ensured' });
  } catch (err) {
    logger.error({
      msg: 'CandidateInvitation index creation failed',
      error: (err as Error).message,
    });
  }
}

/**
 * Create a new candidate invitation
 */
export async function createInvitation(
  input: CreateInvitationInput
): Promise<CandidateInvitation> {
  const client = await getMongoClient();
  const db = client.db();
  const invitations = db.collection<CandidateInvitation>(
    'candidateInvitations'
  );

  const now = new Date();
  const invitation: Omit<CandidateInvitation, '_id'> = {
    jobId: new ObjectId(input.jobId),
    candidateId: new ObjectId(input.candidateId),
    recruiterId: new ObjectId(input.recruiterId),
    message: input.message,
    status: 'sent',
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await invitations.insertOne(
      invitation as CandidateInvitation
    );
    logger.info({
      msg: 'Invitation created',
      jobId: input.jobId,
      candidateId: input.candidateId,
    });

    return {
      _id: result.insertedId,
      ...invitation,
    } as CandidateInvitation;
  } catch (err) {
    // Handle duplicate key error
    if ((err as Error & { code?: number }).code === 11000) {
      logger.warn({
        msg: 'Invitation already exists',
        jobId: input.jobId,
        candidateId: input.candidateId,
      });
      throw new Error('Candidate has already been invited to this job');
    }
    throw err;
  }
}

/**
 * Update invitation status
 */
export async function updateInvitationStatus(
  invitationId: string,
  status: InvitationStatus
): Promise<boolean> {
  const client = await getMongoClient();
  const db = client.db();
  const invitations = db.collection<CandidateInvitation>(
    'candidateInvitations'
  );

  const updateFields: Partial<CandidateInvitation> = {
    status,
    updatedAt: new Date(),
  };

  // Set timestamps based on status
  if (status === 'viewed' && !updateFields.viewedAt) {
    updateFields.viewedAt = new Date();
  }
  if (
    (status === 'applied' || status === 'declined') &&
    !updateFields.respondedAt
  ) {
    updateFields.respondedAt = new Date();
  }

  const result = await invitations.updateOne(
    { _id: new ObjectId(invitationId) },
    { $set: updateFields }
  );

  logger.info({
    msg: 'Invitation status updated',
    invitationId,
    status,
    modified: result.modifiedCount,
  });

  return result.modifiedCount > 0;
}

/**
 * Check if candidate has been invited to a job
 */
export async function hasBeenInvited(
  jobId: string,
  candidateId: string
): Promise<boolean> {
  const client = await getMongoClient();
  const db = client.db();
  const invitations = db.collection<CandidateInvitation>(
    'candidateInvitations'
  );

  const invitation = await invitations.findOne({
    jobId: new ObjectId(jobId),
    candidateId: new ObjectId(candidateId),
  });

  return invitation !== null;
}

/**
 * Get invitations for a specific job with candidate details
 */
export async function getInvitationsByJob(
  jobId: string
): Promise<InvitationWithDetails[]> {
  const client = await getMongoClient();
  const db = client.db();
  const invitations = db.collection<CandidateInvitation>(
    'candidateInvitations'
  );

  const pipeline = [
    {
      $match: { jobId: new ObjectId(jobId) },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'candidateId',
        foreignField: '_id',
        as: 'candidate',
      },
    },
    {
      $unwind: '$candidate',
    },
    {
      $lookup: {
        from: 'jobs',
        localField: 'jobId',
        foreignField: '_id',
        as: 'job',
      },
    },
    {
      $unwind: '$job',
    },
    {
      $project: {
        _id: 1,
        jobId: 1,
        candidateId: 1,
        recruiterId: 1,
        message: 1,
        status: 1,
        sentAt: 1,
        viewedAt: 1,
        respondedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        candidateName: {
          $concat: ['$candidate.firstName', ' ', '$candidate.lastName'],
        },
        candidateEmail: '$candidate.email',
        jobTitle: '$job.title',
        companyName: '$job.company',
      },
    },
    {
      $sort: { sentAt: -1 },
    },
  ];

  const results = await invitations.aggregate(pipeline).toArray();
  return results as InvitationWithDetails[];
}

/**
 * Get invitations sent by a specific recruiter
 */
export async function getInvitationsByRecruiter(
  recruiterId: string,
  limit: number = 50
): Promise<InvitationWithDetails[]> {
  const client = await getMongoClient();
  const db = client.db();
  const invitations = db.collection<CandidateInvitation>(
    'candidateInvitations'
  );

  const pipeline = [
    {
      $match: { recruiterId: new ObjectId(recruiterId) },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'candidateId',
        foreignField: '_id',
        as: 'candidate',
      },
    },
    {
      $unwind: '$candidate',
    },
    {
      $lookup: {
        from: 'jobs',
        localField: 'jobId',
        foreignField: '_id',
        as: 'job',
      },
    },
    {
      $unwind: '$job',
    },
    {
      $project: {
        _id: 1,
        jobId: 1,
        candidateId: 1,
        recruiterId: 1,
        message: 1,
        status: 1,
        sentAt: 1,
        viewedAt: 1,
        respondedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        candidateName: {
          $concat: ['$candidate.firstName', ' ', '$candidate.lastName'],
        },
        candidateEmail: '$candidate.email',
        jobTitle: '$job.title',
        companyName: '$job.company',
      },
    },
    {
      $sort: { sentAt: -1 },
    },
    {
      $limit: limit,
    },
  ];

  const results = await invitations.aggregate(pipeline).toArray();
  return results as InvitationWithDetails[];
}

/**
 * Get invitations received by a candidate
 */
export async function getInvitationsByCandidate(
  candidateId: string
): Promise<InvitationWithDetails[]> {
  const client = await getMongoClient();
  const db = client.db();
  const invitations = db.collection<CandidateInvitation>(
    'candidateInvitations'
  );

  const pipeline = [
    {
      $match: { candidateId: new ObjectId(candidateId) },
    },
    {
      $lookup: {
        from: 'jobs',
        localField: 'jobId',
        foreignField: '_id',
        as: 'job',
      },
    },
    {
      $unwind: '$job',
    },
    {
      $lookup: {
        from: 'users',
        localField: 'recruiterId',
        foreignField: '_id',
        as: 'recruiter',
      },
    },
    {
      $unwind: '$recruiter',
    },
    {
      $project: {
        _id: 1,
        jobId: 1,
        candidateId: 1,
        recruiterId: 1,
        message: 1,
        status: 1,
        sentAt: 1,
        viewedAt: 1,
        respondedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        jobTitle: '$job.title',
        companyName: '$job.company',
      },
    },
    {
      $sort: { sentAt: -1 },
    },
  ];

  const results = await invitations.aggregate(pipeline).toArray();
  return results as InvitationWithDetails[];
}

export const candidateInvitationsRepo = {
  createInvitation,
  updateInvitationStatus,
  hasBeenInvited,
  getInvitationsByJob,
  getInvitationsByRecruiter,
  getInvitationsByCandidate,
  ensureCandidateInvitationIndexes,
};

import { getMongoClient } from '../mongoClient';
import type { Collection, Filter } from 'mongodb';
import type {
  InterviewSession,
  CreateInterviewSessionParams,
  UpdateInterviewSessionParams,
  InterviewStatus,
  InterviewSessionListItem,
} from '../../shared/types/interview';
import { logger } from '../../monitoring/logger';

export class InterviewSessionRepository {
  private async getCollection(): Promise<Collection<InterviewSession>> {
    const client = await getMongoClient();
    return client.db().collection<InterviewSession>('interviewSessions');
  }

  /**
   * Create a new interview session
   */
  async create(
    params: CreateInterviewSessionParams
  ): Promise<InterviewSession> {
    const collection = await this.getCollection();
    const now = new Date();
    const sessionId = crypto.randomUUID();

    const doc: InterviewSession = {
      _id: crypto.randomUUID(),
      userId: params.userId,
      applicationId: params.applicationId,
      jobId: params.jobId,
      sessionId,
      questions: params.questions,
      recordingPath: `${params.userId}/${params.applicationId}/${sessionId}/recording.webm`,
      estimatedDuration: params.estimatedDuration,
      status: 'preparing',
      metadata: {
        videoFormat: 'video/webm',
        audioFormat: 'audio/webm',
        videoResolution: '1280x720',
        transcriptAvailable: false,
        hasWebcam: true,
        hasScreenShare: false,
        ...params.metadata,
      },
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(doc);

    logger.info({
      event: 'interview_session_created',
      sessionId: doc._id,
      userId: params.userId.slice(0, 8),
      applicationId: params.applicationId,
      questionCount: params.questions.length,
      estimatedDuration: params.estimatedDuration,
    });

    return doc;
  }

  /**
   * Find session by ID
   */
  async findById(sessionId: string): Promise<InterviewSession | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: sessionId } as Filter<InterviewSession>);
  }

  /**
   * Find session by sessionId (UUID used for storage paths)
   */
  async findBySessionId(sessionId: string): Promise<InterviewSession | null> {
    const collection = await this.getCollection();
    return collection.findOne({ sessionId } as Filter<InterviewSession>);
  }

  /**
   * Find all sessions for a user
   */
  async findByUser(
    userId: string,
    options?: {
      limit?: number;
      status?: InterviewStatus;
      includeAbandoned?: boolean;
    }
  ): Promise<InterviewSession[]> {
    const collection = await this.getCollection();
    const limit = options?.limit || 50;

    const filter: Filter<InterviewSession> = { userId };

    if (options?.status) {
      filter.status = options.status;
    }

    if (!options?.includeAbandoned) {
      // Exclude abandoned sessions by default
      filter.status = { $ne: 'abandoned' } as unknown as InterviewStatus;
    }

    return collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Find sessions by application ID
   */
  async findByApplication(applicationId: string): Promise<InterviewSession[]> {
    const collection = await this.getCollection();
    return collection
      .find({ applicationId } as Filter<InterviewSession>)
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Find sessions by job ID (useful for analytics)
   */
  async findByJob(jobId: string, limit = 100): Promise<InterviewSession[]> {
    const collection = await this.getCollection();
    return collection
      .find({ jobId } as Filter<InterviewSession>)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Update session (partial update)
   */
  private async update(
    sessionId: string,
    updates: UpdateInterviewSessionParams
  ): Promise<boolean> {
    const collection = await this.getCollection();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateDoc: any = {
      ...updates,
      updatedAt: new Date(),
    };

    // If updating metadata, merge with existing
    if (updates.metadata) {
      const existing = await this.findBySessionId(sessionId);
      if (existing) {
        updateDoc.metadata = {
          ...existing.metadata,
          ...updates.metadata,
        };
      }
    }

    const result = await collection.updateOne(
      { sessionId } as Filter<InterviewSession>,
      { $set: updateDoc }
    );

    logger.info({
      event: 'interview_session_updated',
      sessionId: sessionId.slice(0, 8),
      updates: Object.keys(updates),
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });

    return result.matchedCount > 0;
  }

  /**
   * Update session status
   */
  async updateStatus(
    sessionId: string,
    status: InterviewStatus,
    errorMessage?: string
  ): Promise<boolean> {
    const updates: UpdateInterviewSessionParams = { status };

    if (status === 'error' && errorMessage) {
      updates.errorMessage = errorMessage;
    }

    if (status === 'active' && !errorMessage) {
      updates.startedAt = new Date();
    }

    if (status === 'completed' || status === 'abandoned') {
      updates.endedAt = new Date();
    }

    return this.update(sessionId, updates);
  }

  /**
   * Mark session as completed with recording URL
   */
  async markCompleted(
    sessionId: string,
    videoRecordingUrl: string,
    duration: number,
    metadata?: Partial<InterviewSession['metadata']>
  ): Promise<boolean> {
    return this.update(sessionId, {
      status: 'completed',
      videoRecordingUrl,
      duration,
      endedAt: new Date(),
      metadata,
    });
  }

  /**
   * Mark session as abandoned
   */
  async markAbandoned(sessionId: string): Promise<boolean> {
    return this.updateStatus(sessionId, 'abandoned');
  }

  /**
   * Mark session as error
   */
  async markError(sessionId: string, errorMessage: string): Promise<boolean> {
    return this.updateStatus(sessionId, 'error', errorMessage);
  }

  /**
   * Update interview scores (post-interview analysis)
   */
  async updateScores(
    sessionId: string,
    scores: InterviewSession['scores']
  ): Promise<boolean> {
    return this.update(sessionId, { scores });
  }

  /**
   * Update Q&A transcript and metadata
   */
  async updateQATranscript(
    sessionId: string,
    qaTranscript: InterviewSession['qaTranscript']
  ): Promise<boolean> {
    return this.update(sessionId, {
      qaTranscript,
      metadata: { transcriptAvailable: true },
    });
  }

  /**
   * Update interview summary
   */
  async updateSummary(sessionId: string, summary: string): Promise<boolean> {
    return this.update(sessionId, {
      interviewSummary: summary,
      summaryGeneratedAt: new Date(),
    });
  }

  /**
   * Update session with custom fields (public wrapper for update)
   */
  async updateSession(
    sessionId: string,
    updates: UpdateInterviewSessionParams
  ): Promise<InterviewSession | null> {
    const success = await this.update(sessionId, updates);
    if (!success) return null;
    return this.findBySessionId(sessionId);
  }

  /**
   * Get list view of sessions (lighter payload)
   */
  async getSessionsList(
    userId: string,
    limit = 20
  ): Promise<InterviewSessionListItem[]> {
    const collection = await this.getCollection();

    // Aggregate with job details for list view
    const pipeline = [
      {
        $match: {
          userId,
          status: { $ne: 'abandoned' },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: limit,
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
        $unwind: {
          path: '$job',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          duration: 1,
          startedAt: 1,
          createdAt: 1,
          jobTitle: '$job.title',
          jobCompany: '$job.company',
          questionCount: { $size: '$questions' },
          hasRecording: {
            $cond: {
              if: { $ifNull: ['$videoRecordingUrl', false] },
              then: true,
              else: false,
            },
          },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return results as unknown as InterviewSessionListItem[];
  }

  /**
   * Delete session (use with caution - consider soft delete instead)
   */
  async delete(sessionId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({
      _id: sessionId,
    } as Filter<InterviewSession>);

    logger.warn({
      event: 'interview_session_deleted',
      sessionId: sessionId.slice(0, 8),
      deleted: result.deletedCount > 0,
    });

    return result.deletedCount > 0;
  }

  /**
   * Get statistics for analytics
   */
  async getStats(userId?: string): Promise<{
    total: number;
    completed: number;
    active: number;
    abandoned: number;
    avgDuration: number;
    totalDuration: number;
  }> {
    const collection = await this.getCollection();

    const matchStage = userId ? { userId } : {};

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
            },
          },
          abandoned: {
            $sum: {
              $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0],
            },
          },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          avgDuration: { $avg: { $ifNull: ['$duration', 0] } },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    if (results.length === 0 || !results[0]) {
      return {
        total: 0,
        completed: 0,
        active: 0,
        abandoned: 0,
        avgDuration: 0,
        totalDuration: 0,
      };
    }

    const stats = results[0];
    return {
      total: stats.total || 0,
      completed: stats.completed || 0,
      active: stats.active || 0,
      abandoned: stats.abandoned || 0,
      avgDuration: Math.round(stats.avgDuration || 0),
      totalDuration: stats.totalDuration || 0,
    };
  }
}

/**
 * Singleton instance
 */
export const interviewSessionRepo = new InterviewSessionRepository();

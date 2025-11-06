import { getMongoClient } from '../mongoClient';
import type { Collection, Filter, UpdateResult } from 'mongodb';
import type {
  Application,
  ApplicationStatus,
  ApplicationTimelineEvent,
} from '../../shared/types/application';

export class ApplicationRepository {
  private async getCollection(): Promise<Collection<Application>> {
    const client = await getMongoClient();
    return client.db().collection<Application>('applications');
  }

  async create(
    userId: string,
    jobId: string,
    candidateEmail: string,
    jobTitle: string,
    jobCompany: string,
    resumeVersionId?: string
  ): Promise<Application> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: Application = {
      _id: crypto.randomUUID(),
      userId,
      jobId,
      candidateEmail,
      jobTitle,
      jobCompany,
      status: 'submitted',
      timeline: [
        {
          timestamp: now,
          status: 'submitted',
          actorType: 'candidate',
          actorId: userId,
        },
      ],
      resumeVersionId,
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return doc;
  }

  async findById(id: string): Promise<Application | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: id } as Filter<Application>);
  }

  async findByUser(userId: string, limit = 50): Promise<Application[]> {
    const collection = await this.getCollection();
    return collection
      .find({ userId })
      .sort({ appliedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async findByUserEmail(
    candidateEmail: string,
    limit = 50
  ): Promise<Application[]> {
    const collection = await this.getCollection();
    return collection
      .find({ candidateEmail })
      .sort({ appliedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async findByUserOrEmail(
    userId: string,
    candidateEmail: string,
    limit = 50
  ): Promise<Application[]> {
    const collection = await this.getCollection();
    return collection
      .find({ $or: [{ userId }, { candidateEmail }] })
      .sort({ appliedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async findByUserAndJob(
    userId: string,
    jobId: string
  ): Promise<Application | null> {
    const collection = await this.getCollection();
    return collection.findOne({ userId, jobId } as Filter<Application>);
  }

  async findByUserEmailAndJob(
    candidateEmail: string,
    jobId: string
  ): Promise<Application | null> {
    const collection = await this.getCollection();
    return collection.findOne({ candidateEmail, jobId } as Filter<Application>);
  }

  async updateStatus(
    id: string,
    nextStatus: ApplicationStatus,
    actorType: ApplicationTimelineEvent['actorType'],
    actorId?: string,
    note?: string
  ): Promise<Application | null> {
    const collection = await this.getCollection();
    const event: ApplicationTimelineEvent = {
      timestamp: new Date(),
      status: nextStatus,
      actorType,
      actorId,
      note,
    };
    const result = await collection.findOneAndUpdate(
      { _id: id } as Filter<Application>,
      {
        $set: { status: nextStatus, updatedAt: new Date() },
        $push: { timeline: event },
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  async updateMatchScore(
    id: string,
    matchScore: number,
    breakdown?: Application['scoreBreakdown']
  ): Promise<UpdateResult> {
    const collection = await this.getCollection();
    return collection.updateOne({ _id: id } as Filter<Application>, {
      $set: {
        matchScore,
        scoreBreakdown: breakdown,
        updatedAt: new Date(),
      },
    });
  }

  async markViewedByRecruiter(
    id: string,
    recruiterId: string
  ): Promise<UpdateResult> {
    const collection = await this.getCollection();
    return collection.updateOne({ _id: id } as Filter<Application>, {
      $set: {
        lastViewedByRecruiterAt: new Date(),
        updatedAt: new Date(),
      },
      $push: {
        timeline: {
          timestamp: new Date(),
          status: 'under_review',
          actorType: 'recruiter',
          actorId: recruiterId,
          note: 'Application viewed by recruiter',
        } satisfies ApplicationTimelineEvent,
      },
    });
  }

  async linkInterviewSession(
    applicationId: string,
    interviewSessionId: string
  ): Promise<UpdateResult> {
    const collection = await this.getCollection();
    return collection.updateOne({ _id: applicationId } as Filter<Application>, {
      $set: {
        interviewSessionId,
        interviewStatus: 'in_progress',
        updatedAt: new Date(),
      },
    });
  }

  async updateInterviewCompletion(
    applicationId: string,
    interviewScore: number,
    originalMatchScore: number
  ): Promise<UpdateResult> {
    const collection = await this.getCollection();
    const scoreBoost = Math.min(interviewScore * 0.15, 15); // Max 15 point boost
    const newScore = Math.min(originalMatchScore + scoreBoost, 100);

    return collection.updateOne({ _id: applicationId } as Filter<Application>, {
      $set: {
        interviewStatus: 'completed',
        interviewCompletedAt: new Date(),
        interviewScore,
        scoreBeforeInterview: originalMatchScore,
        scoreAfterInterview: newScore,
        matchScore: newScore,
        updatedAt: new Date(),
      },
    });
  }

  async updateInterviewStatus(
    applicationId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ): Promise<UpdateResult> {
    const collection = await this.getCollection();
    const updates: Partial<Application> = {
      interviewStatus: status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updates.interviewCompletedAt = new Date();
    }

    return collection.updateOne({ _id: applicationId } as Filter<Application>, {
      $set: updates,
    });
  }

  async listForJob(jobId: string, limit = 100): Promise<Application[]> {
    const collection = await this.getCollection();
    return collection
      .find({ jobId })
      .sort({ appliedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async enrichListItems(apps: Application[]) {
    // Job details are now stored directly in applications
    return apps.map(a => {
      const lastEvent = a.timeline[a.timeline.length - 1];
      return {
        _id: a._id,
        jobTitle: a.jobTitle,
        company: a.jobCompany,
        status: a.status,
        matchScore: a.matchScore,
        appliedAt: a.appliedAt,
        lastEventStatus: lastEvent?.status,
        lastEventAt: lastEvent?.timestamp,
        interviewStatus: a.interviewStatus,
        interviewSessionId: a.interviewSessionId,
        interviewScore: a.interviewScore,
        interviewCompletedAt: a.interviewCompletedAt,
        scoreBeforeInterview: a.scoreBeforeInterview,
        scoreAfterInterview: a.scoreAfterInterview,
      };
    });
  }

  /**
   * Get top matching applications for a user (EP3-S10)
   * Filters for match score >50% and sorts by score descending
   */
  async findTopMatches(
    userId: string,
    limit = 5
  ): Promise<
    Array<{
      _id: string;
      jobTitle: string;
      jobCompany: string;
      matchScore: number;
      appliedAt: Date;
      status: ApplicationStatus;
      interviewStatus?: 'not_started' | 'in_progress' | 'completed';
    }>
  > {
    const collection = await this.getCollection();
    const applications = await collection
      .find({
        userId,
        matchScore: { $gt: 50, $exists: true },
      })
      .sort({ matchScore: -1 })
      .limit(limit)
      .toArray();

    return applications.map(app => ({
      _id: app._id,
      jobTitle: app.jobTitle,
      jobCompany: app.jobCompany,
      matchScore: app.matchScore!,
      appliedAt: app.appliedAt,
      status: app.status,
      interviewStatus: app.interviewStatus || 'not_started',
    }));
  }
}

export const applicationRepo = new ApplicationRepository();

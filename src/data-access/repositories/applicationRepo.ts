import { getMongoClient } from '../mongoClient';
import type { Collection, Filter, UpdateResult } from 'mongodb';
import type {
  Application,
  ApplicationStatus,
  ApplicationTimelineEvent,
} from '../../shared/types/application';
import { jobRepo } from './jobRepo';

export class ApplicationRepository {
  private async getCollection(): Promise<Collection<Application>> {
    const client = await getMongoClient();
    return client.db().collection<Application>('applications');
  }

  async create(
    userId: string,
    jobId: string,
    resumeVersionId?: string
  ): Promise<Application> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: Application = {
      _id: crypto.randomUUID(),
      userId,
      jobId,
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

  async findByUserAndJob(
    userId: string,
    jobId: string
  ): Promise<Application | null> {
    const collection = await this.getCollection();
    return collection.findOne({ userId, jobId } as Filter<Application>);
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

  async listForJob(jobId: string, limit = 100): Promise<Application[]> {
    const collection = await this.getCollection();
    return collection
      .find({ jobId })
      .sort({ appliedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async enrichListItems(apps: Application[]) {
    // This is a naive N+1; later optimize with aggregation or caching.
    const jobs = new Map<string, { title: string; company: string }>();
    for (const app of apps) {
      if (!jobs.has(app.jobId)) {
        const job = await jobRepo.findById(app.jobId);
        if (job)
          jobs.set(app.jobId, { title: job.title, company: job.company });
      }
    }
    return apps.map(a => {
      const lastEvent = a.timeline[a.timeline.length - 1];
      return {
        _id: a._id,
        jobTitle: jobs.get(a.jobId)?.title || 'Unknown',
        company: jobs.get(a.jobId)?.company || 'Unknown',
        status: a.status,
        matchScore: a.matchScore,
        appliedAt: a.appliedAt,
        lastEventStatus: lastEvent?.status,
        lastEventAt: lastEvent?.timestamp,
      };
    });
  }
}

export const applicationRepo = new ApplicationRepository();

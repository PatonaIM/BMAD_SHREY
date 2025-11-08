/**
 * Timeline Service
 * Manages application timeline events with role-based filtering and visibility controls
 */

import { ApplicationRepository } from '../data-access/repositories/applicationRepo';
import type { ApplicationTimelineEvent } from '../shared/types/application';

export type UserRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

/**
 * TimelineService handles timeline event management with role-based access control
 */
export class TimelineService {
  private applicationRepo: ApplicationRepository;

  constructor() {
    this.applicationRepo = new ApplicationRepository();
  }

  /**
   * Get timeline events filtered by user role
   * Candidates only see events marked for them, recruiters see all
   */
  async getTimelineForRole(
    applicationId: string,
    role: UserRole
  ): Promise<ApplicationTimelineEvent[]> {
    const application = await this.applicationRepo.findById(applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    const timeline = application.timeline || [];

    // For candidates, filter system and candidate-visible events only
    if (role === 'CANDIDATE') {
      return timeline.filter(
        (event: ApplicationTimelineEvent) =>
          event.actorType === 'system' || event.actorType === 'candidate'
      );
    }

    // Recruiters and admins see all events
    return timeline;
  }

  /**
   * Add a new event to the application timeline
   */
  async addEvent(
    applicationId: string,
    event: Omit<ApplicationTimelineEvent, 'timestamp'>
  ): Promise<void> {
    const application = await this.applicationRepo.findById(applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    const newEvent: ApplicationTimelineEvent = {
      ...event,
      timestamp: new Date(),
    };

    const updatedTimeline = [...(application.timeline || []), newEvent];

    // Use MongoDB collection to update timeline
    const collection = await this.applicationRepo['getCollection']();
    await collection.updateOne(
      { _id: applicationId as never },
      {
        $set: {
          timeline: updatedTimeline,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Add a status change event
   */
  async addStatusChangeEvent(
    applicationId: string,
    newStatus: string,
    actorType: 'system' | 'recruiter' | 'candidate',
    actorId?: string,
    note?: string
  ): Promise<void> {
    await this.addEvent(applicationId, {
      status: newStatus as ApplicationTimelineEvent['status'],
      actorType,
      actorId,
      note,
    });
  }
}

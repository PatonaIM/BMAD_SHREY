/**
 * Timeline Service (Client-Side)
 * Utility functions for timeline event grouping, filtering, and formatting
 */

import type { ApplicationTimelineEvent } from '@/shared/types/application';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export class TimelineService {
  /**
   * Group timeline events by date
   */
  static groupByDate(
    events: ApplicationTimelineEvent[]
  ): Map<string, ApplicationTimelineEvent[]> {
    const grouped = new Map<string, ApplicationTimelineEvent[]>();

    events.forEach(event => {
      const date = new Date(event.timestamp);
      const dateKey = format(date, 'yyyy-MM-dd');

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });

    return grouped;
  }

  /**
   * Filter events by status
   */
  static filterByStatus(
    events: ApplicationTimelineEvent[],
    statuses: string[]
  ): ApplicationTimelineEvent[] {
    if (statuses.length === 0) return events;
    return events.filter(event => statuses.includes(event.status));
  }

  /**
   * Filter events by actor type
   */
  static filterByActorType(
    events: ApplicationTimelineEvent[],
    actorTypes: Array<'system' | 'recruiter' | 'candidate'>
  ): ApplicationTimelineEvent[] {
    if (actorTypes.length === 0) return events;
    return events.filter(event => actorTypes.includes(event.actorType));
  }

  /**
   * Get relative time for display (e.g., "2 hours ago")
   */
  static getRelativeTime(timestamp: Date | string): string {
    const date =
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  }

  /**
   * Get formatted date header (e.g., "Today", "Yesterday", "March 15, 2024")
   */
  static getDateHeader(timestamp: Date | string): string {
    const date =
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    if (isToday(date)) {
      return 'Today';
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMMM d, yyyy');
  }

  /**
   * Get formatted time (e.g., "2:30 PM")
   */
  static getFormattedTime(timestamp: Date | string): string {
    const date =
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return format(date, 'h:mm a');
  }

  /**
   * Get status label for display
   */
  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      submitted: 'Application Submitted',
      ai_interview: 'AI Interview Completed',
      under_review: 'Under Review',
      interview_scheduled: 'Interview Scheduled',
      offer: 'Offer Extended',
      rejected: 'Application Rejected',
    };
    return labels[status] || status;
  }

  /**
   * Get actor label for display
   */
  static getActorLabel(
    actorType: 'system' | 'recruiter' | 'candidate'
  ): string {
    const labels: Record<string, string> = {
      system: 'System',
      recruiter: 'Recruiter',
      candidate: 'You',
    };
    return labels[actorType] || actorType;
  }

  /**
   * Sort events by timestamp (descending - newest first)
   */
  static sortByTimestamp(
    events: ApplicationTimelineEvent[],
    order: 'asc' | 'desc' = 'desc'
  ): ApplicationTimelineEvent[] {
    return [...events].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return order === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }
}

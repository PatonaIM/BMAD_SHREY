/**
 * CandidateTimeline Component
 * Read-only timeline view for candidates (role-filtered)
 */

'use client';

import { TimelineView } from '@/components/recruiter/timeline/TimelineView';
import { useTimeline } from '@/hooks/recruiter/useTimeline';

interface CandidateTimelineProps {
  applicationId: string;
}

/**
 * CandidateTimeline - Role-filtered read-only timeline for candidates
 * Uses the same TimelineView component but data is pre-filtered by backend
 */
export function CandidateTimeline({ applicationId }: CandidateTimelineProps) {
  const { timeline, isLoading, refetch } = useTimeline(applicationId);

  // Convert timestamp strings to Date objects
  const normalizedTimeline = timeline.map(event => ({
    ...event,
    timestamp: new Date(event.timestamp),
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <TimelineView
        applicationId={applicationId}
        timeline={normalizedTimeline}
        isLoading={isLoading}
        onRefresh={refetch}
      />
    </div>
  );
}

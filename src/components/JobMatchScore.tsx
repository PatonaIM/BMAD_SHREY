'use client';

/**
 * Legacy individual match score component
 *
 * ⚠️ DEPRECATED: For new implementations, use BatchJobMatchScore instead.
 * This component fetches match scores individually which is inefficient
 * when displaying multiple jobs on a page (25 API calls vs 1 batch call).
 *
 * Use cases:
 * - Single job detail pages (OK to use)
 * - Backward compatibility (OK to use)
 *
 * For list views (homepage, dashboard, search results):
 * - Use BatchMatchProvider + BatchJobMatchScore instead
 *
 * @see BatchJobMatchScore for optimized batch fetching
 */

import { useState, useEffect } from 'react';
import { MatchScoreBadge, ScoreBreakdownModal } from './matching';
import type { JobCandidateMatch } from '../shared/types/matching';

interface JobMatchScoreProps {
  jobId: string;
  jobTitle: string;
}

interface MatchData {
  jobId: string;
  score: JobCandidateMatch['score'];
  factors: JobCandidateMatch['factors'];
  reasoning: string[];
  calculatedAt: Date;
}

/**
 * Client component that displays match score badge and modal for a single job
 * Fetches match score on first render
 */
export function JobMatchScore({ jobId, jobTitle }: JobMatchScoreProps) {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Load match score on mount
  useEffect(() => {
    let mounted = true;

    async function fetchMatchScore() {
      try {
        const response = await fetch('/api/jobs/batch-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds: [jobId] }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch match score');
        }

        const data = await response.json();
        if (mounted && data.success && data.matches.length > 0) {
          setMatchData(data.matches[0]);
        }
      } catch {
        // Silent fail - match scores are non-critical
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchMatchScore();

    return () => {
      mounted = false;
    };
  }, [jobId]);

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-full" />
    );
  }

  // Don't render anything if no match data (user not logged in or error)
  if (!matchData) {
    return null;
  }

  // Convert to JobCandidateMatch format for modal
  const fullMatch: JobCandidateMatch = {
    jobId: matchData.jobId,
    userId: '',
    score: matchData.score,
    factors: matchData.factors,
    reasoning: matchData.reasoning,
    calculatedAt: new Date(matchData.calculatedAt),
  };

  return (
    <div className="inline-flex">
      <MatchScoreBadge
        score={matchData.score.overall}
        showLabel
        onClick={() => setShowModal(true)}
      />

      <ScoreBreakdownModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        match={fullMatch}
        jobTitle={jobTitle}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { MatchScoreBadge, ScoreBreakdownModal } from './matching';
import type { JobCandidateMatch } from '../shared/types/matching';

interface MatchData {
  jobId: string;
  score: JobCandidateMatch['score'];
  factors: JobCandidateMatch['factors'];
  reasoning: string[];
  calculatedAt: Date;
  cached: boolean;
}

interface BatchMatchContextValue {
  getMatchData: (_jobId: string) => MatchData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  openModal: (_jobId: string, _jobTitle: string) => void;
  hasProfile: boolean | null; // null = unknown, false = no profile, true = has profile
  isAuthenticated: boolean | null; // null = unknown, false = not logged in, true = logged in
}

const BatchMatchContext = createContext<BatchMatchContextValue | null>(null);

interface BatchMatchProviderProps {
  jobIds: string[];
  children: React.ReactNode;
}

/**
 * Provider that batch-fetches match scores for all jobs on the page
 * More efficient than individual fetches per job
 */
export function BatchMatchProvider({
  jobIds,
  children,
}: BatchMatchProviderProps) {
  const [matchData, setMatchData] = useState<Map<string, MatchData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    jobId: string | null;
    jobTitle: string;
  }>({
    isOpen: false,
    jobId: null,
    jobTitle: '',
  });

  // Batch fetch all match scores on mount
  useEffect(() => {
    let mounted = true;
    const MAX_RETRIES = 2;

    async function fetchAllMatchScores() {
      if (jobIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await fetch('/api/jobs/batch-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds }),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 401) {
            // User not authenticated
            if (mounted) {
              setIsAuthenticated(false);
              setLoading(false);
            }
            return;
          }
          throw new Error(`Failed to fetch match scores: ${response.status}`);
        }

        const data = await response.json();
        if (mounted && data.success) {
          setIsAuthenticated(true);
          setHasProfile(data.hasProfile ?? false);

          const matchMap = new Map<string, MatchData>();
          for (const match of data.matches) {
            matchMap.set(match.jobId, match);
          }
          setMatchData(matchMap);
          setRetryCount(0); // Reset on success
        }
      } catch (err) {
        if (!mounted) return;

        // Retry on network errors (max 2 retries)
        if (retryCount < MAX_RETRIES) {
          setTimeout(
            () => {
              setRetryCount(prev => prev + 1);
            },
            1000 * (retryCount + 1)
          ); // Exponential backoff
          return;
        }

        // Max retries reached - set error state
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load match scores';
        setError(errorMsg);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchAllMatchScores();

    return () => {
      mounted = false;
    };
  }, [jobIds, retryCount]);

  const getMatchData = (jobId: string) => {
    return matchData.get(jobId) || null;
  };

  const openModal = (jobId: string, jobTitle: string) => {
    setModalState({
      isOpen: true,
      jobId,
      jobTitle,
    });
  };

  const retry = () => {
    setRetryCount(0);
    setError(null);
    setLoading(true);
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      jobId: null,
      jobTitle: '',
    });
  };

  // Get current match for modal
  const currentMatch = modalState.jobId
    ? matchData.get(modalState.jobId)
    : null;

  const fullMatch: JobCandidateMatch | null = currentMatch
    ? {
        jobId: currentMatch.jobId,
        userId: '',
        score: currentMatch.score,
        factors: currentMatch.factors,
        reasoning: currentMatch.reasoning,
        calculatedAt: new Date(currentMatch.calculatedAt),
      }
    : null;

  return (
    <BatchMatchContext.Provider
      value={{
        getMatchData,
        loading,
        error,
        retry,
        openModal,
        hasProfile,
        isAuthenticated,
      }}
    >
      {children}

      {/* Shared modal for all badges */}
      {fullMatch && (
        <ScoreBreakdownModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          match={fullMatch}
          jobTitle={modalState.jobTitle}
        />
      )}
    </BatchMatchContext.Provider>
  );
}

/**
 * Hook to access batch match data
 */
function useBatchMatch() {
  const context = useContext(BatchMatchContext);
  if (!context) {
    throw new Error('useBatchMatch must be used within BatchMatchProvider');
  }
  return context;
}

interface BatchJobMatchScoreProps {
  jobId: string;
  jobTitle: string;
}

/**
 * Optimized match score component that uses batch-fetched data
 * Must be used within BatchMatchProvider
 */
export function BatchJobMatchScore({
  jobId,
  jobTitle,
}: BatchJobMatchScoreProps) {
  const {
    getMatchData,
    loading,
    error,
    retry,
    openModal,
    hasProfile,
    isAuthenticated,
  } = useBatchMatch();

  // Show skeleton while batch loading
  if (loading) {
    return (
      <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-full" />
    );
  }

  // Show error state with retry button
  if (error) {
    return (
      <button
        onClick={retry}
        className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
        aria-label="Retry loading match scores"
        title={error}
      >
        Retry Match Scores
      </button>
    );
  }

  // Show login prompt for unauthenticated users
  if (isAuthenticated === false) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-primary hover:text-brand-secondary dark:text-brand-primary dark:hover:text-brand-secondary transition-colors border border-brand-primary/20 rounded-full hover:border-brand-primary/40"
        aria-label="Sign in to see your match score"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
          />
        </svg>
        <span>Sign in for match score</span>
      </a>
    );
  }

  // Show profile creation prompt for authenticated users without profile
  if (isAuthenticated === true && hasProfile === false) {
    return (
      <a
        href="/profile/edit"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-primary hover:text-brand-secondary dark:text-brand-primary dark:hover:text-brand-secondary transition-colors border border-brand-primary/20 rounded-full hover:border-brand-primary/40"
        aria-label="Create profile to see match scores"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>Create profile for score</span>
      </a>
    );
  }

  const matchData = getMatchData(jobId);

  // Don't render if no match data (shouldn't happen if hasProfile is true)
  if (!matchData) {
    return null;
  }

  return (
    <div className="inline-flex">
      <MatchScoreBadge
        score={matchData.score.overall}
        showLabel
        onClick={() => openModal(jobId, jobTitle)}
      />
    </div>
  );
}

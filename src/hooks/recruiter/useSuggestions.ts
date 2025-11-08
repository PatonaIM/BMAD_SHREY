/**
 * useSuggestions Hook
 * React Query hook for fetching AI-powered candidate suggestions
 */

import { trpc } from '@/services/trpc/client';

interface UseSuggestionsOptions {
  jobId: string;
  limit?: number;
  minMatchScore?: number;
  requiredSkills?: string[];
  minYearsExperience?: number;
  maxYearsExperience?: number;
  location?: string;
  isRemote?: boolean;
  enabled?: boolean;
}

/**
 * Hook to fetch candidate suggestions for a job
 * Uses React Query with 5-minute stale time
 */
export function useSuggestions({
  jobId,
  limit = 10,
  minMatchScore,
  requiredSkills,
  minYearsExperience,
  maxYearsExperience,
  location,
  isRemote,
  enabled = true,
}: UseSuggestionsOptions) {
  const query = trpc.recruiter.getSuggestedCandidates.useQuery(
    {
      jobId,
      limit,
      minMatchScore,
      requiredSkills,
      minYearsExperience,
      maxYearsExperience,
      location,
      isRemote,
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  return {
    suggestions: query.data?.suggestions || [],
    count: query.data?.count || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

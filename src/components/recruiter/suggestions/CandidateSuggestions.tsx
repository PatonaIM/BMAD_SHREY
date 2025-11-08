/**
 * CandidateSuggestions Component
 * Grid of AI-powered candidate suggestions with filtering and actions
 */

'use client';

import { RefreshCw, Users } from 'lucide-react';
import { SuggestionCard } from './SuggestionCard';
import { useSuggestions } from '@/hooks/recruiter/useSuggestions';
import { LoadingSpinner } from '@/components/ui/OptimisticLoader';
import { trpc } from '@/services/trpc/client';

interface CandidateSuggestionsProps {
  jobId: string;
  jobTitle?: string;
  onViewProfile?: (_userId: string) => void;
}

/**
 * CandidateSuggestions - Display grid of candidate suggestions
 */
export function CandidateSuggestions({
  jobId,
  jobTitle,
  onViewProfile,
}: CandidateSuggestionsProps) {
  // Fetch all suggestions sorted by match score (no filtering)
  const { suggestions, count, isLoading, error, refetch } = useSuggestions({
    jobId,
    limit: 10,
  });

  // Mutation for inviting candidates
  const inviteMutation = trpc.recruiter.inviteCandidate.useMutation({
    onSuccess: () => {
      // Show success toast
      alert('Invitation sent successfully!');
    },
    onError: err => {
      alert(`Failed to send invitation: ${err.message}`);
    },
  });

  const handleInvite = (userId: string) => {
    if (window.confirm('Send invitation to this candidate?')) {
      inviteMutation.mutate({
        jobId,
        candidateId: userId,
        message: `We found your profile interesting for our ${jobTitle || 'position'}.`,
      });
    }
  };

  const handleViewProfile = (userId: string) => {
    if (onViewProfile) {
      onViewProfile(userId);
    } else {
      // For now, show alert since we don't have a standalone candidate profile page
      // TODO: Create /recruiter/candidates/[userId] page
      alert(
        'Profile view coming soon! For now, you can send an invitation and view the profile when they apply.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-red-600 dark:text-red-400">
          Error loading suggestions: {error.message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI-Powered Candidate Suggestions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {count} candidate{count !== 1 ? 's' : ''} matching this position
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh suggestions"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Suggestions Grid */}
      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No suggestions found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            We couldn't find any candidates matching your criteria. Try
            adjusting your requirements or check back later as new candidates
            join.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.candidateId.toString()}
              userId={suggestion.candidateId.toString()}
              candidateEmail={suggestion.email}
              summary={suggestion.currentTitle}
              matchScore={suggestion.matchScore}
              matchReasons={suggestion.matchedSkills}
              skills={suggestion.skills}
              experienceYears={suggestion.yearsOfExperience}
              location={suggestion.location}
              applicationCount={suggestion.applicationCount}
              onInvite={handleInvite}
              onViewProfile={handleViewProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

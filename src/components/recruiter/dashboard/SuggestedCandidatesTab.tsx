'use client';

import React, { useState } from 'react';
import { trpc } from '../../../services/trpc/client';
import { SuggestedCandidateCard } from './SuggestedCandidateCard';

interface SuggestedCandidatesTabProps {
  jobId?: string;
}

export function SuggestedCandidatesTab({ jobId }: SuggestedCandidatesTabProps) {
  const [viewMode, setViewMode] = useState<'proactive' | 'high-scorers'>(
    jobId ? 'proactive' : 'high-scorers'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          AI-Powered Candidate Suggestions
        </h2>

        {jobId && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('proactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'proactive'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Matched for this Job
            </button>
            <button
              onClick={() => setViewMode('high-scorers')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'high-scorers'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Top Candidates
            </button>
          </div>
        )}
      </div>

      {viewMode === 'proactive' && jobId ? (
        <ProactiveMatchesSection jobId={jobId} />
      ) : (
        <HighScorersSection />
      )}
    </div>
  );
}

interface ProactiveMatchesSectionProps {
  jobId: string;
}

function ProactiveMatchesSection({ jobId }: ProactiveMatchesSectionProps) {
  const [minMatchScore, setMinMatchScore] = useState<number>(70);

  const { data, isLoading, error } =
    trpc.recruiter.getSuggestedCandidates.useQuery({
      jobId,
      minMatchScore,
      limit: 20,
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">
          Finding matched candidates...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load candidate suggestions</p>
        <p className="text-sm text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  const suggestions = data?.suggestions || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
        <label className="text-sm font-medium text-gray-700">
          Minimum Match Score:
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={minMatchScore}
          onChange={e => setMinMatchScore(Number(e.target.value))}
          className="flex-1 max-w-xs"
        />
        <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">
          {minMatchScore}%
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No candidates found matching your criteria. Try lowering the minimum
            match score.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Found {suggestions.length} candidate
            {suggestions.length !== 1 ? 's' : ''} with {minMatchScore}%+ match
            score
          </p>
          <div className="grid gap-4">
            {suggestions.map(suggestion => (
              <SuggestedCandidateCard
                key={suggestion.candidateId.toString()}
                suggestion={suggestion}
                jobId={jobId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HighScorersSection() {
  const { data, isLoading, error } =
    trpc.recruiter.getHighScoringCandidates.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading top candidates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load top candidates</p>
        <p className="text-sm text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  const suggestions = data?.suggestions || [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          These candidates have strong profiles with complete information and
          relevant experience. They may be a good fit for multiple open
          positions.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No high-scoring candidates available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Showing {suggestions.length} top candidate
            {suggestions.length !== 1 ? 's' : ''}
          </p>
          <div className="grid gap-4">
            {suggestions.map(suggestion => (
              <SuggestedCandidateCard
                key={suggestion.candidateId.toString()}
                suggestion={suggestion}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

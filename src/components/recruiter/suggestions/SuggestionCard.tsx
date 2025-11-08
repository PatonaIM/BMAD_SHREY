/**
 * SuggestionCard Component
 * Individual candidate suggestion card with match score and skills
 */

'use client';

import { useState } from 'react';
import { User, Mail, Briefcase, Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SuggestionCardProps {
  userId: string;
  candidateEmail?: string;
  candidateName?: string;
  summary?: string | null;
  matchScore: number;
  matchReasons?: string[];
  skills?: string[];
  experienceYears?: number;
  location?: string;
  applicationCount?: number;
  onInvite?: (_userId: string) => void;
  onViewProfile?: (_userId: string) => void;
}

/**
 * Get color class for match score badge
 */
function getScoreColor(score: number) {
  if (score >= 80)
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (score >= 60)
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
}

/**
 * SuggestionCard - Display candidate suggestion with match details
 */
export function SuggestionCard({
  userId,
  candidateEmail,
  summary,
  matchScore,
  matchReasons = [],
  skills = [],
  experienceYears,
  location,
  applicationCount = 0,
  onInvite,
  onViewProfile,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const topSkills = skills.slice(0, 5);

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6',
        'transition-all duration-200 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600',
        'cursor-pointer'
      )}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          setIsExpanded(!isExpanded);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Email and Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              Anonymous Candidate
            </h3>
            {candidateEmail && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-1">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{candidateEmail}</span>
              </p>
            )}
            {applicationCount !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {applicationCount} active application
                {applicationCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Match Score Badge */}
        <div
          className={cn(
            'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
            getScoreColor(matchScore)
          )}
        >
          {Math.round(matchScore)}%
        </div>
      </div>

      {/* Match Reasons */}
      {matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {matchReasons.slice(0, 3).map((reason, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
            >
              <Star className="w-3 h-3 text-yellow-500" />
              {reason}
            </div>
          ))}
        </div>
      )}

      {/* Experience and Location */}
      {(experienceYears !== undefined || location) && (
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          {experienceYears !== undefined && (
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              {experienceYears}+ years
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {location}
            </div>
          )}
        </div>
      )}

      {/* Top Skills */}
      {topSkills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Top Matching Skills:
          </p>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Summary */}
      {isExpanded && summary && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {summary}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onViewProfile?.(userId);
          }}
          className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onInvite?.(userId);
          }}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!onInvite}
        >
          Send Invitation
        </button>
      </div>
    </div>
  );
}

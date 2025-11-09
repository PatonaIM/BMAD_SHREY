'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { JobCandidateMatch } from '../../shared/types/matching';

export interface ScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: JobCandidateMatch | null;
  jobTitle: string;
}

/**
 * ScoreBreakdownModal Component
 *
 * Displays detailed breakdown of job-candidate match score including:
 * - Overall score with visual progress bar
 * - Component scores (skills, experience, other factors)
 * - Matched and missing skills
 * - Human-readable reasoning
 * - Improvement recommendations
 *
 * Note: Each component shows its ACTUAL SCORE (0-100%),
 * and the weight (%) indicates its contribution to the overall score.
 *
 * @example
 * ```tsx
 * <ScoreBreakdownModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   match={matchData}
 *   jobTitle="Senior Frontend Engineer"
 * />
 * ```
 */
export function ScoreBreakdownModal({
  isOpen,
  onClose,
  match,
  jobTitle,
}: ScoreBreakdownModalProps): React.ReactElement | null {
  const router = useRouter();

  // Don't render if not open or no match data
  if (!isOpen || !match) return null;

  let score = match.score;
  const { factors } = match;

  // Check if we have a cached semantic score from vector search
  const getCachedSemanticScore = (jobId: string): number | null => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('semanticScores');
      if (cached) {
        const cacheData = JSON.parse(cached);
        const jobScore = cacheData[jobId];
        if (jobScore && jobScore.semantic !== undefined) {
          // Check if cache is recent (within last hour)
          const age = Date.now() - jobScore.timestamp;
          if (age < 3600000) {
            return jobScore.semantic;
          }
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  };

  const cachedSemantic = getCachedSemanticScore(match.jobId);
  if (cachedSemantic !== null) {
    // Override semantic score with cached value from vector search
    score = {
      ...score,
      semantic: Math.round(cachedSemantic),
    };
  }

  // Calculate overall score band
  const getScoreBand = (score: number) => {
    if (score >= 85)
      return {
        label: 'Excellent Match',
        color: 'text-green-600 dark:text-green-400',
      };
    if (score >= 60)
      return {
        label: 'Good Match',
        color: 'text-yellow-600 dark:text-yellow-400',
      };
    return {
      label: 'Weak Match',
      color: 'text-red-600 dark:text-red-400',
    };
  };

  const band = getScoreBand(score.overall);

  // Progress bar component for individual scores
  const ScoreBar = ({
    label,
    value,
    max = 100,
  }: {
    label: string;
    value: number;
    max?: number;
  }) => {
    const percentage = (value / max) * 100;
    const barColor =
      value >= 85
        ? 'bg-green-500'
        : value >= 60
          ? 'bg-yellow-500'
          : 'bg-red-500';

    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-700 dark:text-neutral-300">
            {label}
          </span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {value}%
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 ${barColor} transition-all duration-300 rounded-full`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={`${label}: ${value}%`}
          />
        </div>
      </div>
    );
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key and body scroll lock
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        // Always restore scroll when modal closes
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-6 flex justify-between items-start">
          <div>
            <h2
              id="modal-title"
              className="text-xl font-bold text-neutral-900 dark:text-neutral-100"
            >
              Match Score Breakdown
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {jobTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overall Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Overall Match
              </h3>
              <span className={`text-2xl font-bold ${band.color}`}>
                {score.overall}%
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 ${score.overall >= 85 ? 'bg-green-500' : score.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'} transition-all duration-300`}
                style={{ width: `${score.overall}%` }}
                role="progressbar"
                aria-valuenow={score.overall}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className={`text-sm font-medium ${band.color}`}>{band.label}</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Confidence: {Math.round(score.confidence * 100)}%
            </p>
          </div>
          {/* Component Scores */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Score Components
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
              Each bar shows the actual score (0-100%). The percentage in
              parentheses is how much it contributes to your overall score.
            </p>
            <div className="space-y-3">
              <ScoreBar
                label="Semantic Similarity (35% weight)"
                value={score.semantic}
              />
              <ScoreBar
                label="Skills Alignment (40% weight)"
                value={score.skills}
              />
              <ScoreBar
                label="Experience Match (15% weight)"
                value={score.experience}
              />
              <ScoreBar
                label="Other Factors (10% weight)"
                value={score.other}
              />
            </div>
            <div className="mt-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                <strong>Example:</strong> If Semantic = 70%, Skills = 80%,
                Experience = 60%:
                <br />
                Overall = (70 × 0.35) + (80 × 0.40) + (60 × 0.15) + (other ×
                0.10) ={' '}
                {Math.round(
                  score.semantic * 0.35 +
                    score.skills * 0.4 +
                    score.experience * 0.15 +
                    score.other * 0.1
                )}
                %
              </p>
            </div>
          </div>
          {/* Skills Analysis */}
          {(factors.skillsAlignment.matchedSkills.length > 0 ||
            factors.skillsAlignment.missingSkills.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Skills Analysis
              </h3>

              {/* Matched Skills */}
              {factors.skillsAlignment.matchedSkills.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                    ✓ Matched Skills (
                    {factors.skillsAlignment.matchedSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {factors.skillsAlignment.matchedSkills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {factors.skillsAlignment.missingSkills.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                    ✗ Missing Skills (
                    {factors.skillsAlignment.missingSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {factors.skillsAlignment.missingSkills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Skills Match Ratio:{' '}
                {Math.round(factors.skillsAlignment.skillsMatchRatio * 100)}% •{' '}
                Proficiency Score:{' '}
                {Math.round(factors.skillsAlignment.proficiencyScore * 100)}%
              </p>
            </div>
          )}{' '}
          {/* Why this score? */}
          {match.reasoning && match.reasoning.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Why this score?
              </h3>
              <ul className="space-y-2">
                {match.reasoning.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <span className="text-brand-primary mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Improvement Tips */}
          {score.overall < 85 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                💡 How to improve your match
              </h3>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                {factors.skillsAlignment.missingSkills.length > 0 && (
                  <li>
                    • Add missing skills to your profile:{' '}
                    {factors.skillsAlignment.missingSkills
                      .slice(0, 3)
                      .join(', ')}
                  </li>
                )}
                {factors.skillsAlignment.proficiencyScore < 0.7 && (
                  <li>
                    • Update skill proficiency levels to reflect your expertise
                  </li>
                )}
                {factors.experienceMatch.levelAlignment < 0.7 && (
                  <li>• Add more relevant work experience to your profile</li>
                )}
                {score.overall >= 60 && score.overall < 85 && (
                  <li>
                    • Take an AI interview to boost your score by 5-15 points
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-6 flex gap-3">
          {score.overall < 85 && (
            <button
              onClick={() => {
                onClose();
                router.push('/profile/edit');
              }}
              className="btn-primary flex-1 px-4 py-2 text-sm"
            >
              Complete Profile
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-outline flex-1 px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

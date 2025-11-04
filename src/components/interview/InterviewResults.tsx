'use client';

import React, { useState } from 'react';
import type {
  InterviewScores,
  ScoringFeedback,
} from '../../services/ai/interviewScoring';

interface InterviewResultsProps {
  scores: InterviewScores;
  feedback: ScoringFeedback;
  scoreBoost?: number;
  scoreBeforeInterview?: number;
  scoreAfterInterview?: number;
  onClose?: () => void;
  className?: string;
}

export function InterviewResults({
  scores,
  feedback,
  scoreBoost,
  scoreBeforeInterview,
  scoreAfterInterview,
  onClose,
  className = '',
}: InterviewResultsProps) {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreRating = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Interview Complete!</h2>
            <p className="text-blue-100">Here's how you performed</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white mb-4">
            <div>
              <div className="text-5xl font-bold">{scores.overall}</div>
              <div className="text-sm opacity-90">/ 100</div>
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${getScoreColor(scores.overall)}`}>
            {getScoreRating(scores.overall)} Performance
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {feedback.detailedAnalysis.substring(0, 150)}...
          </p>
        </div>

        {/* Score Boost (if applicable) */}
        {scoreBoost !== undefined && scoreBoost > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  +{scoreBoost}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Application Score Boosted!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {scoreBeforeInterview}% → {scoreAfterInterview}% (+
                  {scoreBoost} points)
                </p>
              </div>
              <div className="text-4xl">🎉</div>
            </div>
          </div>
        )}

        {/* Component Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Technical Score */}
          <div
            className={`${getScoreBgColor(scores.technical)} rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Technical
              </span>
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div
              className={`text-3xl font-bold ${getScoreColor(scores.technical)}`}
            >
              {scores.technical}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              60% weight
            </div>
          </div>

          {/* Communication Score */}
          <div
            className={`${getScoreBgColor(scores.communication)} rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Communication
              </span>
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div
              className={`text-3xl font-bold ${getScoreColor(scores.communication)}`}
            >
              {scores.communication}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              40% weight
            </div>
          </div>

          {/* Experience Score */}
          <div
            className={`${getScoreBgColor(scores.experience)} rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Experience
              </span>
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div
              className={`text-3xl font-bold ${getScoreColor(scores.experience)}`}
            >
              {scores.experience}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Quality of examples
            </div>
          </div>
        </div>

        {/* Strengths */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Your Strengths
          </h4>
          <ul className="space-y-2">
            {feedback.strengths.map((strength, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
              >
                <span className="text-green-500 mt-1">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Areas for Improvement
          </h4>
          <ul className="space-y-2">
            {feedback.improvements.map((improvement, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
              >
                <span className="text-blue-500 mt-1">•</span>
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Recommendations
          </h4>
          <ul className="space-y-2">
            {feedback.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
              >
                <span className="text-purple-500 mt-1">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Detailed Breakdown Toggle */}
        <div>
          <button
            onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
            className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              Detailed Score Breakdown
            </span>
            <svg
              className={`w-5 h-5 transform transition-transform ${showDetailedBreakdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showDetailedBreakdown && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {/* Technical Factors */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  Technical Factors
                </h5>
                <div className="space-y-2">
                  <ScoreBar
                    label="Technical Depth"
                    score={scores.breakdown.technicalFactors.depth}
                  />
                  <ScoreBar
                    label="Accuracy"
                    score={scores.breakdown.technicalFactors.accuracy}
                  />
                  <ScoreBar
                    label="Problem Solving"
                    score={scores.breakdown.technicalFactors.problemSolving}
                  />
                </div>
              </div>

              {/* Communication Factors */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  Communication Factors
                </h5>
                <div className="space-y-2">
                  <ScoreBar
                    label="Clarity"
                    score={scores.breakdown.communicationFactors.clarity}
                  />
                  <ScoreBar
                    label="Articulation"
                    score={scores.breakdown.communicationFactors.articulation}
                  />
                  <ScoreBar
                    label="Engagement"
                    score={scores.breakdown.communicationFactors.engagement}
                  />
                </div>
              </div>

              {/* Experience Factors */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  Experience Factors
                </h5>
                <div className="space-y-2">
                  <ScoreBar
                    label="Relevance"
                    score={scores.breakdown.experienceFactors.relevance}
                  />
                  <ScoreBar
                    label="Example Quality"
                    score={scores.breakdown.experienceFactors.examples}
                  />
                  <ScoreBar
                    label="Impact"
                    score={scores.breakdown.experienceFactors.impact}
                  />
                </div>
              </div>

              {/* Confidence */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <ScoreBar
                  label="AI Confidence in Scoring"
                  score={scores.confidence}
                />
              </div>
            </div>
          )}
        </div>

        {/* Detailed Analysis */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Detailed Analysis
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
            {feedback.detailedAnalysis}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
}

function ScoreBar({ label, score }: ScoreBarProps) {
  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {score}/100
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

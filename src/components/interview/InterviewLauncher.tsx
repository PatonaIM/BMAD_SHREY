'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoRecordingManager } from '../../services/media/videoRecordingManager';

interface InterviewLauncherProps {
  jobId: string;
  applicationId: string;
  matchScore?: number;
  hasExistingInterview?: boolean;
  disabled?: boolean;
  className?: string;
}

export function InterviewLauncher({
  jobId,
  applicationId,
  matchScore: _matchScore = 0,
  hasExistingInterview = false,
  disabled = false,
  className = '',
}: InterviewLauncherProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunchInterview = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Check browser support
      if (!VideoRecordingManager.isSupported()) {
        setError(
          'Your browser does not support video recording. Please use a modern browser like Chrome, Firefox, or Edge.'
        );
        return;
      }

      // Generate questions
      const questionsResponse = await fetch(
        '/api/interview/generate-questions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        }
      );

      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json();
        throw new Error(
          errorData.error?.message || 'Failed to generate questions'
        );
      }

      const questionsData = await questionsResponse.json();
      const questions = questionsData.value.questions;

      // Start session
      const sessionResponse = await fetch('/api/interview/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          applicationId,
          questions,
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error?.message || 'Failed to start session');
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.value.sessionId;

      // Navigate to interview page
      router.push(`/interview/${sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to launch interview'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const isDisabled = disabled || isGenerating || hasExistingInterview;

  const getButtonText = () => {
    if (isGenerating) return 'Preparing Interview...';
    if (hasExistingInterview) return 'Interview Completed';
    return 'Take AI Interview';
  };

  const getButtonTooltip = () => {
    if (hasExistingInterview) {
      return 'You have already completed an interview for this application';
    }
    return 'Start an AI-powered video interview';
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleLaunchInterview}
        disabled={isDisabled}
        title={getButtonTooltip()}
        className={`
          btn-primary px-6 py-3 text-sm font-medium
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2 justify-center
          ${className}
        `}
      >
        {isGenerating ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{getButtonText()}</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>{getButtonText()}</span>
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

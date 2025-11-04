/**
 * InterviewControls Component
 * Reusable control buttons for interview actions (start, end, pause, etc.)
 */

'use client';

import React from 'react';

export type InterviewPhase =
  | 'ready'
  | 'interviewing'
  | 'paused'
  | 'ending'
  | 'complete';

export interface InterviewControlsProps {
  phase: InterviewPhase;
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
}

export function InterviewControls({
  phase,
  onStart,
  onEnd,
  onPause,
  onResume,
  isProcessing = false,
  disabled = false,
  className = '',
}: InterviewControlsProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {phase === 'ready' && onStart && (
        <button
          onClick={onStart}
          disabled={disabled}
          className="bg-[#10B981] hover:bg-[#059669] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          Start Interview
        </button>
      )}

      {phase === 'interviewing' && (
        <>
          {onEnd && (
            <button
              onClick={onEnd}
              disabled={disabled || isProcessing}
              className="bg-[#EF4444] hover:bg-[#DC2626] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
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
                  Uploading...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  End Interview
                </>
              )}
            </button>
          )}

          {onPause && (
            <button
              onClick={onPause}
              disabled={disabled}
              className="bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Pause
            </button>
          )}
        </>
      )}

      {phase === 'paused' && onResume && (
        <button
          onClick={onResume}
          disabled={disabled}
          className="bg-[#10B981] hover:bg-[#059669] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          Resume Interview
        </button>
      )}
    </div>
  );
}

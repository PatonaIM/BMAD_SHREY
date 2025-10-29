'use client';
import React, { useState } from 'react';

interface ExtractionResult {
  extractionStatus: string;
  extractedAt: string;
  skillCount: number;
  experienceCount: number;
  educationCount: number;
  costEstimate?: number;
}

interface AIExtractionButtonProps {
  resumeVersionId: string;
}

export const AIExtractionButton: React.FC<AIExtractionButtonProps> = ({
  resumeVersionId,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!resumeVersionId) {
      setError('No resume version selected');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/profile/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeVersionId }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      setResult(data.value);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={handleExtract}
          disabled={isExtracting || !resumeVersionId}
          className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {isExtracting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Extracting...
            </>
          ) : (
            <>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Extract with AI
            </>
          )}
        </button>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          Estimated cost: ~3-5¢
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-red-700 dark:text-red-300 text-sm font-medium">
              Extraction Failed
            </span>
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
          <div className="flex items-center space-x-2 mb-3">
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-green-700 dark:text-green-300 text-sm font-semibold">
              Extraction Complete!
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Skills found:
              </span>{' '}
              <span className="font-medium">{result.skillCount}</span>
            </div>
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Experience entries:
              </span>{' '}
              <span className="font-medium">{result.experienceCount}</span>
            </div>
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Education entries:
              </span>{' '}
              <span className="font-medium">{result.educationCount}</span>
            </div>
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Status:
              </span>{' '}
              <span className="font-medium capitalize">
                {result.extractionStatus}
              </span>
            </div>
          </div>

          {result.costEstimate && (
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Cost: {result.costEstimate}¢ • Extracted at{' '}
                {new Date(result.extractedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

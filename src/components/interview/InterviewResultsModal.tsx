'use client';

import React, { useEffect } from 'react';
import { InterviewResults } from './InterviewResults';
import type {
  InterviewScores,
  ScoringFeedback,
} from '../../services/ai/interviewScoring';

interface InterviewResultsModalProps {
  open: boolean;
  onClose: () => void;
  scores: InterviewScores;
  feedback: ScoringFeedback;
  scoreBoost?: number;
  scoreBeforeInterview?: number;
  scoreAfterInterview?: number;
  onViewApplication?: () => void;
  applicationId?: string;
}

export function InterviewResultsModal({
  open,
  onClose,
  scores,
  feedback,
  scoreBoost,
  scoreBeforeInterview,
  scoreAfterInterview,
  onViewApplication,
  applicationId,
}: InterviewResultsModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleViewApplication = () => {
    if (onViewApplication) {
      onViewApplication();
    } else if (applicationId) {
      window.location.href = `/applications/${applicationId}`;
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <InterviewResults
          scores={scores}
          feedback={feedback}
          scoreBoost={scoreBoost}
          scoreBeforeInterview={scoreBeforeInterview}
          scoreAfterInterview={scoreAfterInterview}
          onClose={onClose}
        />

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleViewApplication}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
          >
            View Application
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

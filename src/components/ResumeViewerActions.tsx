'use client';
import React from 'react';

interface ResumeViewerActionsProps {
  resumeUrl: string;
}

export const ResumeViewerActions: React.FC<ResumeViewerActionsProps> = ({
  resumeUrl,
}) => {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="mt-6 flex gap-3">
      <button onClick={handleBack} className="btn-outline px-4 py-2">
        Back
      </button>
      <a
        href={resumeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary px-4 py-2 inline-flex items-center gap-2"
      >
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
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        Open in New Tab
      </a>
    </div>
  );
};

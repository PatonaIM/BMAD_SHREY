'use client';

/**
 * RecruiterActions Component
 *
 * Provides quick action buttons for recruiters to manage application stages.
 * Allows scheduling interviews, giving assignments, and progressing candidates.
 *
 * @module RecruiterActions
 */

import React, { useState } from 'react';
import { Calendar, FileText, Plus } from 'lucide-react';

interface RecruiterActionsProps {
  applicationId: string;
  onScheduleInterview?: () => void;
  onGiveAssignment?: () => void;
  onAddStage?: () => void;
}

export function RecruiterActions({
  applicationId,
  onScheduleInterview,
  onGiveAssignment,
  onAddStage,
}: RecruiterActionsProps): JSX.Element {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const handleScheduleInterview = () => {
    setIsScheduleModalOpen(true);
    onScheduleInterview?.();
  };

  const handleGiveAssignment = () => {
    setIsAssignmentModalOpen(true);
    onGiveAssignment?.();
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Quick Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleScheduleInterview}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Calendar className="h-4 w-4" />
          Schedule Interview
        </button>
        <button
          onClick={handleGiveAssignment}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <FileText className="h-4 w-4" />
          Give Assignment
        </button>
        <button
          onClick={onAddStage}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-gray-900 dark:text-white border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add Stage
        </button>
      </div>

      {/* Modals will be implemented separately */}
      {isScheduleModalOpen && (
        <ScheduleInterviewModal
          applicationId={applicationId}
          onClose={() => setIsScheduleModalOpen(false)}
        />
      )}
      {isAssignmentModalOpen && (
        <GiveAssignmentModal
          applicationId={applicationId}
          onClose={() => setIsAssignmentModalOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Placeholder modal components - to be implemented
 */
function ScheduleInterviewModal({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Schedule Interview</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Application ID: {applicationId}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This feature will be implemented to integrate with your calendar
          system.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function GiveAssignmentModal({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Give Assignment</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Application ID: {applicationId}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This feature will be implemented to create and send assignments to
          candidates.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

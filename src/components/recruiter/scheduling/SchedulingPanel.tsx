/**
 * SchedulingPanel Component
 * Displays scheduled calls and provides scheduling interface
 */

'use client';

import React, { useState } from 'react';
import { useScheduling } from '@/hooks/useScheduling';
import CallScheduler from './CallScheduler';

interface SchedulingPanelProps {
  applicationId?: string; // If provided, shows calls for this application
}

export default function SchedulingPanel({
  applicationId,
}: SchedulingPanelProps) {
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled' | 'all'
  >('scheduled');

  const { scheduledCalls, isLoadingCalls, error, updateCallStatus } =
    useScheduling({
      status: filterStatus === 'all' ? undefined : filterStatus,
    });

  // Filter by application if provided
  const filteredCalls = applicationId
    ? scheduledCalls.filter(call => call.applicationId === applicationId)
    : scheduledCalls;

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Failed to load scheduled calls: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Scheduled Interviews
        </h2>
        {applicationId && (
          <button
            onClick={() => setIsSchedulerOpen(true)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Schedule Interview
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto">
        {(
          ['all', 'scheduled', 'completed', 'cancelled', 'no_show'] as const
        ).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ${
              filterStatus === status
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Calls List */}
      {isLoadingCalls ? (
        <div className="text-center py-8 text-gray-500">
          Loading scheduled calls...
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No scheduled interviews found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCalls.map(call => {
            const scheduledDate = new Date(call.scheduledAt);
            const isPast = scheduledDate < new Date();

            return (
              <div
                key={call._id}
                className="border rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {call.candidateEmail}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          call.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : call.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : call.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {call.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        📅 {scheduledDate.toLocaleDateString()} at{' '}
                        {scheduledDate.toLocaleTimeString()}
                      </p>
                      <p>⏱️ Duration: {call.duration} minutes</p>
                      {call.notes && <p>📝 {call.notes}</p>}
                      {call.meetLink && (
                        <a
                          href={call.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-indigo-600 hover:text-indigo-500"
                        >
                          🔗 Join Google Meet
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {call.status === 'scheduled' && isPast && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateCallStatus(call._id, 'completed')}
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={() => updateCallStatus(call._id, 'no_show')}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        No Show
                      </button>
                    </div>
                  )}

                  {call.status === 'scheduled' && !isPast && (
                    <button
                      onClick={() =>
                        updateCallStatus(
                          call._id,
                          'cancelled',
                          'Cancelled by recruiter'
                        )
                      }
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {applicationId && (
        <CallScheduler
          isOpen={isSchedulerOpen}
          onClose={() => setIsSchedulerOpen(false)}
          applicationId={applicationId}
        />
      )}
    </div>
  );
}

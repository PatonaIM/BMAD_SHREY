/**
 * CallScheduler Component
 * Modal for scheduling a new interview call
 */

'use client';

import React, { useState } from 'react';
import { useScheduling } from '@/hooks/useScheduling';

interface CallSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
}

export default function CallScheduler({
  isOpen,
  onClose,
  applicationId,
}: CallSchedulerProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');

  const { scheduleCall, isScheduling, error } = useScheduling();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledDate || !scheduledTime) {
      alert('Please select both date and time');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    const result = await scheduleCall({
      applicationId,
      scheduledAt,
      duration,
      notes: notes || undefined,
    });

    if (result.success) {
      alert(
        `Interview scheduled successfully!${result.meetLink ? `\n\nMeet link: ${result.meetLink}` : ''}`
      );
      onClose();
      // Reset form
      setScheduledDate('');
      setScheduledTime('');
      setDuration(30);
      setNotes('');
    } else {
      alert(`Failed to schedule interview: ${result.error}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Schedule Interview
              </h3>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Time */}
                <div>
                  <label
                    htmlFor="time"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Duration (minutes)
                  </label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Add any notes about the interview..."
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={isScheduling}
                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
              >
                {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isScheduling}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

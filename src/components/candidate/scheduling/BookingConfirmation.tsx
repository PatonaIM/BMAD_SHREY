/**
 * BookingConfirmation Component
 * Confirms slot selection and allows adding notes
 */

'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, ChevronLeft, Loader2 } from 'lucide-react';
import type { TimeSlot } from '@/services/candidateSchedulingService';

interface BookingConfirmationProps {
  slot: TimeSlot;
  recruiterName: string;
  onConfirm: (_notes?: string) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function BookingConfirmation({
  slot,
  recruiterName,
  onConfirm,
  onBack,
  isSubmitting,
}: BookingConfirmationProps) {
  const [notes, setNotes] = useState('');

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(notes.trim() || undefined);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          Confirm Your Booking
        </h3>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Selected Time Display */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-900">
              {format(slot.start, 'EEEE, MMMM d, yyyy')}
            </p>
            <div className="flex items-center gap-1 mt-1 text-sm text-indigo-700">
              <Clock className="h-4 w-4" />
              {format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}
              <span className="text-indigo-600 ml-1">(10 minutes)</span>
            </div>
            <p className="text-xs text-indigo-600 mt-1">
              Your timezone: {userTimezone}
            </p>
            <p className="text-xs text-indigo-600 mt-2">With {recruiterName}</p>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Notes for the Recruiter{' '}
            <span className="text-gray-500">(Optional)</span>
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={isSubmitting}
            placeholder="Any specific topics you'd like to discuss or questions you have..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-500">
            {notes.length}/500 characters
          </p>
        </div>

        {/* What to Expect */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            What to Expect
          </h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                You'll receive a Google Calendar invite with a Meet link
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                Email confirmation will be sent to your registered email
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                You can cancel up to 24 hours before the scheduled time
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

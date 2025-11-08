/**
 * BookingSuccess Component
 * Displays confirmation after successful booking
 */

'use client';

import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Calendar, ExternalLink } from 'lucide-react';

interface BookingSuccessProps {
  scheduledAt: Date;
  meetLink?: string;
  recruiterName: string;
  onDone: () => void;
}

export default function BookingSuccess({
  scheduledAt,
  meetLink,
  recruiterName,
  onDone,
}: BookingSuccessProps) {
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="rounded-lg border border-green-200 bg-white p-6">
      {/* Success Icon */}
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Call Scheduled Successfully!
        </h3>
        <p className="text-sm text-gray-600">
          Your follow-up call with {recruiterName} has been confirmed
        </p>
      </div>

      {/* Call Details */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {format(scheduledAt, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {format(scheduledAt, 'h:mm a')} (10 minutes)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your timezone: {userTimezone}
            </p>
          </div>
        </div>

        {meetLink && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Join Google Meet
            </a>
          </div>
        )}
      </div>

      {/* Next Steps */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          What Happens Next?
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>
              Check your email for a Google Calendar invite with the Meet link
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>You'll receive a reminder email 1 day before the call</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>
              You can cancel or reschedule up to 24 hours before the scheduled
              time
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>Prepare any questions you'd like to ask about the role</span>
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <button
          onClick={onDone}
          className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Done
        </button>
      </div>
    </div>
  );
}

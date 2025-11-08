/**
 * SchedulingEligibility Component
 * Checks if candidate is eligible to schedule and displays appropriate UI
 */

'use client';

import React from 'react';
import { trpc } from '@/services/trpc/client';
import { Calendar, Check, X, AlertCircle } from 'lucide-react';

interface SchedulingEligibilityProps {
  applicationId: string;
  onEligible: () => void;
}

export default function SchedulingEligibility({
  applicationId,
  onEligible,
}: SchedulingEligibilityProps) {
  const { data, isLoading, error } =
    trpc.candidate.checkSchedulingEligibility.useQuery({
      applicationId,
    });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-600">
            Checking eligibility to schedule...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">
              Failed to Check Eligibility
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error.message || 'Please try again later.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Not eligible
  if (!data.eligible) {
    const isAlreadyBooked = data.hasExistingBooking;

    return (
      <div
        className={`rounded-lg border p-6 ${
          isAlreadyBooked
            ? 'border-blue-200 bg-blue-50'
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-start gap-3">
          {isAlreadyBooked ? (
            <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          ) : (
            <X className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h3
              className={`text-sm font-medium ${
                isAlreadyBooked ? 'text-blue-900' : 'text-gray-900'
              }`}
            >
              {isAlreadyBooked
                ? 'Follow-up Call Already Scheduled'
                : 'Scheduling Not Available'}
            </h3>
            <p
              className={`mt-1 text-sm ${
                isAlreadyBooked ? 'text-blue-700' : 'text-gray-700'
              }`}
            >
              {data.reason}
            </p>
            {isAlreadyBooked && (
              <p className="mt-2 text-xs text-blue-600">
                Check your email for the Google Meet link and calendar invite.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Eligible to schedule
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6">
      <div className="flex items-start gap-3">
        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-green-900">
            Ready to Schedule Your Follow-up Call
          </h3>
          <p className="mt-1 text-sm text-green-700">
            Great job completing your AI interview! You can now book a 10-minute
            follow-up call with the recruiter.
          </p>
          <button
            onClick={onEligible}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <Calendar className="h-4 w-4" />
            View Available Times
          </button>
        </div>
      </div>
    </div>
  );
}

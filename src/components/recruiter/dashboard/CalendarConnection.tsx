'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { trpc } from '@/services/trpc/client';

/**
 * CalendarConnection Component
 * Shows Google Calendar connection status and provides connect/disconnect buttons
 * Only visible to recruiters
 */
export function CalendarConnection() {
  const { data: session } = useSession();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check URL parameters for OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('calendar_connected');
    const error = params.get('calendar_error');

    if (connected === 'true') {
      setSuccessMessage('Google Calendar connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (error) {
      setErrorMessage(`Calendar connection failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Query calendar connection status
  const { data: calendarStatus, isLoading } =
    trpc.recruiter.getCalendarStatus.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // Disconnect mutation
  const disconnectMutation = trpc.recruiter.disconnectCalendar.useMutation({
    onSuccess: () => {
      setSuccessMessage('Calendar disconnected successfully');
      window.location.reload(); // Refresh to update status
    },
    onError: (error: { message: string }) => {
      setErrorMessage(`Failed to disconnect: ${error.message}`);
    },
  });

  const handleConnect = () => {
    // Redirect to calendar OAuth flow
    window.location.href = '/api/auth/calendar-connect';
  };

  const handleDisconnect = () => {
    if (
      confirm(
        'Are you sure you want to disconnect your Google Calendar? This will stop all scheduling features.'
      )
    ) {
      disconnectMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400 animate-pulse" />
          <span className="text-sm text-gray-500">
            Loading calendar status...
          </span>
        </div>
      </div>
    );
  }

  const isConnected = calendarStatus?.connected || false;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Google Calendar Integration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isConnected
                ? 'Your calendar is connected and ready for scheduling'
                : 'Connect your calendar to enable interview scheduling'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {isConnected ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-200">
              {successMessage}
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800 dark:text-red-200">
              {errorMessage}
            </span>
          </div>
        </div>
      )}

      {/* Connection Details */}
      {isConnected && calendarStatus && 'connectedAt' in calendarStatus && (
        <div className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex justify-between">
            <span>Connected:</span>
            <span className="font-medium">
              {new Date(calendarStatus.connectedAt).toLocaleDateString()}
            </span>
          </div>
          {'expiresAt' in calendarStatus && calendarStatus.expiresAt && (
            <div className="flex justify-between">
              <span>Token Expires:</span>
              <span
                className={`font-medium ${
                  calendarStatus.expiresAt < Date.now()
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {new Date(calendarStatus.expiresAt).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Permissions:</span>
            <span className="font-medium text-xs">
              Calendar read/write access
            </span>
          </div>
        </div>
      )}

      {/* Feature List */}
      {!isConnected && (
        <div className="mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-md p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            With Calendar connected you can:
          </p>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">✓</span>
              <span>Schedule interviews with Google Meet links</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">✓</span>
              <span>Let candidates book available time slots</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">✓</span>
              <span>Automatic calendar event creation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">✓</span>
              <span>Email invitations with calendar attachments</span>
            </li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isConnected ? (
          <>
            <button
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Reconnect
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Connect Google Calendar
          </button>
        )}
      </div>

      {/* Privacy Note */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        We only request calendar permissions when you explicitly connect. Your
        calendar data is only used for scheduling interviews.
      </p>
    </div>
  );
}

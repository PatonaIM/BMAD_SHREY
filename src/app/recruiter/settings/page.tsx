'use client';

import React from 'react';

/**
 * Recruiter settings page (placeholder)
 * Future: Google Chat integration, notification preferences, etc.
 */
export default function RecruiterSettingsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Recruiter Settings
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Manage your preferences and integrations
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Settings Coming Soon
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Notification preferences, Google Chat integration, and more will be
            available in the next release.
          </p>
        </div>
      </div>
    </div>
  );
}

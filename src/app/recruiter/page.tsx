'use client';

import React from 'react';
import { RecruiterDashboard } from '../../components/recruiter/dashboard/RecruiterDashboard';

/**
 * Main recruiter dashboard page
 * Displays job management interface with Active/All/Closed tabs
 */
export default function RecruiterPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Recruiter Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Manage your job subscriptions and track applications
        </p>
      </div>

      {/* Dashboard Content */}
      <RecruiterDashboard />
    </div>
  );
}

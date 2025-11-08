'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Sparkles } from 'lucide-react';
import { trpc } from '@/services/trpc/client';
import { ApplicationGrid } from '@/components/recruiter/applications/ApplicationGrid';
import { CandidateSuggestions } from '@/components/recruiter/suggestions/CandidateSuggestions';
import { LoadingSpinner } from '@/components/ui/OptimisticLoader';
import type { Application } from '@/shared/types/application';
import { cn } from '@/lib/utils/cn';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

/**
 * Applications page for a specific job
 * Shows all applications with filtering and inline actions
 * Plus AI-powered candidate suggestions
 */
export default function ApplicationsPage({ params }: PageProps) {
  const { jobId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'applications' | 'suggestions'>(
    'applications'
  );

  // Fetch applications for this job
  const { data, isLoading, error } = trpc.recruiter.getApplications.useQuery({
    jobId,
    page: 1,
    limit: 50,
  });

  const handleFeedback = (_applicationId: string) => {
    // TODO: Implement feedback modal
  };

  const handleSchedule = (_applicationId: string) => {
    // TODO: Implement scheduling modal
  };

  const handleShare = (_applicationId: string) => {
    // TODO: Implement share modal
  };

  const handleView = (applicationId: string) => {
    router.push(`/recruiter/applications/${applicationId}`);
  };

  const handleViewSuggestionProfile = (userId: string) => {
    // Navigate to user profile or create application preview
    router.push(`/profile/${userId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Job Candidates
          </h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {data.pagination.total} total applications
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className={cn(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2',
                activeTab === 'applications'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <Users className="h-5 w-5" />
              Applications
              {data && (
                <span
                  className={cn(
                    'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium',
                    activeTab === 'applications'
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-300'
                  )}
                >
                  {data.pagination.total}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('suggestions')}
              className={cn(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2',
                activeTab === 'suggestions'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <Sparkles className="h-5 w-5" />
              AI Suggestions
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'applications' && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400">
                  Error loading applications: {error.message}
                </p>
              </div>
            )}

            {data && (
              <ApplicationGrid
                applications={data.applications as unknown as Application[]}
                onFeedback={handleFeedback}
                onSchedule={handleSchedule}
                onShare={handleShare}
                onView={handleView}
              />
            )}
          </>
        )}

        {activeTab === 'suggestions' && (
          <CandidateSuggestions
            jobId={jobId}
            onViewProfile={handleViewSuggestionProfile}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { trpc } from '@/services/trpc/client';
import { ApplicationGrid } from '@/components/recruiter/applications/ApplicationGrid';
import { LoadingSpinner } from '@/components/ui/OptimisticLoader';
import type { Application } from '@/shared/types/application';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

/**
 * Applications page for a specific job
 * Shows all applications with filtering and inline actions
 */
export default function ApplicationsPage({ params }: PageProps) {
  const { jobId } = use(params);
  const router = useRouter();

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
            Applications
          </h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {data.pagination.total} total applications
            </p>
          )}
        </div>

        {/* Content */}
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
      </div>
    </div>
  );
}

import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '@/data-access/repositories/applicationRepo';
import { jobRepo } from '@/data-access/repositories/jobRepo';
import { ApplicationTimeline } from '@/components/timeline';
import { RecruiterActions } from '@/components/recruiter/RecruiterActions';
import { CollapsibleApplicationHeader } from '@/components/application/CollapsibleApplicationHeader';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecruiterApplicationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;

  if (!userSession?.email) {
    redirect(`/login?redirect=/recruiter/applications/${id}`);
  }

  // Check if user has recruiter role
  const user = session?.user as { roles?: string[] } | undefined;
  if (!user?.roles?.includes('RECRUITER')) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  const app = await applicationRepo.findById(id);
  if (!app) return notFound();

  const job = await jobRepo.findById(app.jobId);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 relative">
      {/* Collapsible Header - Full Width */}
      <CollapsibleApplicationHeader
        backHref={`/recruiter/jobs/${app.jobId}/applications`}
        backLabel="Back to Applications"
        jobTitle={job?.title || 'Unknown Role'}
        status={app.status}
        matchScore={app.matchScore ?? undefined}
        rightContent={<RecruiterActions applicationId={app._id.toString()} />}
      />

      {/* Scrollable Timeline Container */}
      <div
        id="timeline-scroll-container"
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Full-Width Timeline */}
          <ApplicationTimeline
            applicationId={app._id.toString()}
            jobId={app.jobId.toString()}
            viewAs="recruiter"
            applicationData={{
              candidateEmail: app.candidateEmail,
              matchScore: app.matchScore ?? undefined,
              scoreBreakdown: app.scoreBreakdown
                ? {
                    semanticSimilarity: app.scoreBreakdown.semanticSimilarity,
                    skillsAlignment: app.scoreBreakdown.skillsAlignment,
                    experienceLevel: app.scoreBreakdown.experienceLevel,
                    otherFactors: app.scoreBreakdown.otherFactors,
                  }
                : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}

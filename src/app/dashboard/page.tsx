import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { redirect } from 'next/navigation';
import { applicationRepo } from '../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../data-access/repositories/jobRepo';
import { findUserByEmail } from '../../data-access/repositories/userRepo';
import { getExtractedProfile } from '../../data-access/repositories/extractedProfileRepo';
import { getResume } from '../../data-access/repositories/resumeRepo';
import { computeCompleteness } from '../../services/profile/completenessScoring';
import { ProfileEditingService } from '../../services/profile/profileEditingService';
import { ProfileCompletenessCard } from '../../components/dashboard/ProfileCompletenessCard';
import { QuickActionsWidget } from '../../components/dashboard/QuickActionsWidget';
import { JobRecommendationsContainer } from '../../components/dashboard/JobRecommendationsContainer';
// import { SkillsGapWidget } from '../../components/dashboard/SkillsGapWidget';
// import { MatchDistributionChart } from '../../components/dashboard/MatchDistributionChart';
import Link from 'next/link';
import type { EditableProfile } from '../../shared/types/profileEditing';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;
  if (!userSession?.email) {
    redirect(`/login?redirect=/dashboard`);
  }

  const candidateEmail = userSession.email as string;

  // Get user ID for profile/resume lookups
  let userId: string | null = null;
  if (userSession.id) {
    userId = userSession.id;
  } else {
    const user = await findUserByEmail(candidateEmail);
    userId = user?._id || null;
  }

  // Fetch user data
  const [apps, latestJobs, extractedProfile, resume] = await Promise.all([
    applicationRepo.findByUserEmail(candidateEmail, 100),
    jobRepo.search({ page: 1, limit: 5 }).then(r => r.jobs),
    userId ? getExtractedProfile(userId) : null,
    userId ? getResume(userId) : null,
  ]);

  // Get the most recent profile (same logic as API route)
  let profile: EditableProfile | null = extractedProfile;
  if (profile && userId) {
    const editingService = new ProfileEditingService(userId);
    const versionsRes = await editingService.list(1);
    // Use version if it exists and is newer
    if (versionsRes.ok && versionsRes.value.length && versionsRes.value[0]) {
      profile = versionsRes.value[0].profile;
    }
  }

  const enriched = await applicationRepo.enrichListItems(apps);

  // Calculate profile completeness
  const completenessCalc = profile
    ? computeCompleteness(profile)
    : { ok: false, value: null, error: 'No profile' };
  const completenessResult = completenessCalc.ok
    ? completenessCalc.value
    : null;

  // Calculate match distribution (placeholder - will be enhanced)
  // const matchDistribution = {
  //   excellent: enriched.filter(app => app.matchScore && app.matchScore >= 85)
  //     .length,
  //   good: enriched.filter(
  //     app => app.matchScore && app.matchScore >= 65 && app.matchScore < 85
  //   ).length,
  //   fair: enriched.filter(
  //     app => app.matchScore && app.matchScore >= 40 && app.matchScore < 65
  //   ).length,
  //   poor: enriched.filter(app => app.matchScore && app.matchScore < 40).length,
  // };

  // Calculate eligible interview count (60-85% match, not yet interviewed)
  const eligibleInterviewCount = enriched.filter(
    app =>
      app.matchScore &&
      app.matchScore >= 60 &&
      app.matchScore < 85 &&
      !app.lastEventStatus?.includes('interview')
  ).length;

  // Get first eligible application for quick action link
  const firstEligibleApp = enriched.find(
    app =>
      app.matchScore &&
      app.matchScore >= 60 &&
      app.matchScore < 85 &&
      !app.lastEventStatus?.includes('interview')
  );

  // Calculate completed interview count
  const completedInterviewCount = enriched.filter(
    app => app.interviewStatus === 'completed'
  ).length;

  // Get first completed interview application
  const firstCompletedInterviewApp = enriched.find(
    app => app.interviewStatus === 'completed'
  );

  // Extract skills from profile for gap analysis (placeholder)
  const userSkills = new Set(
    (profile?.skills || []).map(s => s.name.toLowerCase())
  );
  const jobSkills = latestJobs.flatMap(j => j.skills);
  const skillCounts: Record<string, number> = {};
  jobSkills.forEach(skill => {
    const skillLower = skill.toLowerCase();
    if (!userSkills.has(skillLower)) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }
  });
  const missingSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, demand]) => ({ name, demand }));

  return (
    <div className="flex flex-col gap-8">
      <header
        aria-labelledby="dashboard-heading"
        className="flex flex-col gap-2"
      >
        <h1
          id="dashboard-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          Your Dashboard
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Track your applications and explore new opportunities.
        </p>
      </header>

      {/* Top Widgets Row - Profile & Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileCompletenessCard
          score={completenessResult}
          hasResume={!!resume}
        />

        {/* Applications Summary Widget */}
        <section
          aria-labelledby="applications-summary-heading"
          className="flex flex-col gap-4 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm"
        >
          <h2
            id="applications-summary-heading"
            className="text-xl font-semibold"
          >
            Applications
          </h2>
          {enriched.length === 0 ? (
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                You haven&apos;t applied to any jobs yet. Browse roles and apply
                to get started.
              </p>
              <Link
                href="/jobs"
                className="inline-flex mt-3 btn-primary px-4 py-2 text-sm"
              >
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enriched.slice(0, 3).map(app => (
                <div
                  key={app._id}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 shadow-sm"
                >
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                    {app.jobTitle}{' '}
                    <span className="text-xs text-neutral-500">
                      @ {app.company}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Applied {app.appliedAt.toLocaleDateString()} • Status:{' '}
                    {app.status}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${app.status === 'submitted' ? 'bg-brand-primary/10 text-brand-primary ring-brand-primary/30' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-neutral-300 dark:ring-neutral-700'}`}
                    >
                      {app.status}
                    </span>
                    {typeof app.matchScore === 'number' && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                          app.matchScore >= 85
                            ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 ring-green-600/20'
                            : app.matchScore >= 65
                              ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 ring-blue-600/20'
                              : app.matchScore >= 40
                                ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20'
                                : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 ring-red-600/20'
                        }`}
                      >
                        Match {app.matchScore}%
                      </span>
                    )}
                    {app.interviewStatus === 'completed' &&
                      app.interviewScore && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 ring-purple-600/20">
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Interview: {app.interviewScore}%
                        </span>
                      )}
                  </div>
                  {app.lastEventStatus && (
                    <p className="mt-2 text-[10px] text-neutral-500">
                      Last update: {app.lastEventStatus} on{' '}
                      {app.lastEventAt?.toLocaleDateString()}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/applications/${app._id}`}
                      className="btn-outline px-3 py-1.5 text-xs"
                    >
                      View Details
                    </Link>
                    {app.interviewStatus === 'completed' ? (
                      <Link
                        href={`/applications/${app._id}#interview`}
                        className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Interview
                      </Link>
                    ) : app.interviewStatus === 'in_progress' ? (
                      <Link
                        href={`/interview/${app.interviewSessionId}`}
                        className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        <svg
                          className="w-3 h-3 animate-pulse"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Continue Interview
                      </Link>
                    ) : (
                      app.matchScore !== undefined &&
                      app.matchScore >= 50 &&
                      app.matchScore < 90 && (
                        <Link
                          href={`/applications/${app._id}#interview`}
                          className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                          Take AI Interview
                        </Link>
                      )
                    )}
                  </div>
                </div>
              ))}
              {enriched.length > 3 && (
                <Link
                  href="#applications-detail"
                  className="btn-outline w-full py-2 text-sm text-center block mt-3"
                >
                  View All {enriched.length} Applications
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Recommendations & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JobRecommendationsContainer limit={5} />
        <QuickActionsWidget
          profileCompleteness={completenessResult?.score || 0}
          hasResume={!!resume}
          eligibleInterviewCount={eligibleInterviewCount}
          hasSkillGaps={missingSkills.length > 0}
          firstEligibleApplicationId={firstEligibleApp?._id.toString()}
          completedInterviewCount={completedInterviewCount}
          firstCompletedInterviewApplicationId={firstCompletedInterviewApp?._id.toString()}
        />
      </div>

      {/* Detailed Applications Section */}
      <section
        id="applications-detail"
        aria-labelledby="applications-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="applications-heading" className="text-xl font-semibold">
          All Applications
        </h2>
        {enriched.length === 0 && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You haven&apos;t applied to any jobs yet. Browse roles and apply
              to get started.
            </p>
            <Link
              href="/"
              className="inline-flex mt-3 btn-primary px-4 py-2 text-sm"
            >
              Browse Roles
            </Link>
          </div>
        )}
        <div className="space-y-4">
          {enriched.map(app => (
            <div
              key={app._id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 shadow-sm"
            >
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                {app.jobTitle}{' '}
                <span className="text-xs text-neutral-500">
                  @ {app.company}
                </span>
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Applied {app.appliedAt.toLocaleDateString()} • Status:{' '}
                {app.status}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${app.status === 'submitted' ? 'bg-brand-primary/10 text-brand-primary ring-brand-primary/30' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-neutral-300 dark:ring-neutral-700'}`}
                >
                  {app.status}
                </span>
                {typeof app.matchScore === 'number' && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                      app.matchScore >= 85
                        ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 ring-green-600/20'
                        : app.matchScore >= 65
                          ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 ring-blue-600/20'
                          : app.matchScore >= 40
                            ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20'
                            : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 ring-red-600/20'
                    }`}
                  >
                    Match {app.matchScore}%
                  </span>
                )}
                {app.interviewStatus === 'completed' && app.interviewScore && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 ring-purple-600/20">
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Interview: {app.interviewScore}%
                  </span>
                )}
              </div>
              {app.lastEventStatus && (
                <p className="mt-2 text-[10px] text-neutral-500">
                  Last update: {app.lastEventStatus} on{' '}
                  {app.lastEventAt?.toLocaleDateString()}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/applications/${app._id}`}
                  className="btn-outline px-3 py-1.5 text-xs"
                >
                  View Details
                </Link>
                {app.interviewStatus === 'completed' ? (
                  <Link
                    href={`/applications/${app._id}#interview`}
                    className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View Interview
                  </Link>
                ) : app.interviewStatus === 'in_progress' ? (
                  <Link
                    href={`/interview/${app.interviewSessionId}`}
                    className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3 animate-pulse"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Continue Interview
                  </Link>
                ) : (
                  app.matchScore !== undefined &&
                  app.matchScore >= 50 &&
                  app.matchScore < 90 && (
                    <Link
                      href={`/applications/${app._id}#interview`}
                      className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      Take AI Interview
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Widgets Row */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkillsGapWidget missingSkills={missingSkills} />
        <MatchDistributionChart
          distribution={matchDistribution}
          totalJobs={enriched.length}
        />
      </div> */}

      {/* Available Jobs Section */}
      <section
        aria-labelledby="latest-jobs-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="latest-jobs-heading" className="text-xl font-semibold">
          Latest Jobs
        </h2>
        <div className="space-y-4">
          {latestJobs.map(job => (
            <div
              key={job._id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 shadow-sm"
            >
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                {job.title}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                {job.company}
                {job.location ? ` • ${job.location}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {job.skills.slice(0, 3).map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-1 ring-neutral-300 dark:ring-neutral-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-3">
                <Link
                  href={`/jobs/${job.workableId || job._id}`}
                  className="btn-outline px-3 py-1.5 text-xs"
                >
                  Details
                </Link>
                <Link
                  href={`/jobs/${job.workableId || job._id}/apply`}
                  className="btn-primary px-3 py-1.5 text-xs"
                >
                  Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

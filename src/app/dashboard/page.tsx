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
import { SkillsGapWidget } from '../../components/dashboard/SkillsGapWidget';
import { MatchDistributionChart } from '../../components/dashboard/MatchDistributionChart';
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
  const matchDistribution = {
    excellent: enriched.filter(app => app.matchScore && app.matchScore >= 85)
      .length,
    good: enriched.filter(
      app => app.matchScore && app.matchScore >= 65 && app.matchScore < 85
    ).length,
    fair: enriched.filter(
      app => app.matchScore && app.matchScore >= 40 && app.matchScore < 65
    ).length,
    poor: enriched.filter(app => app.matchScore && app.matchScore < 40).length,
  };

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

      {/* Top Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileCompletenessCard
          score={completenessResult}
          hasResume={!!resume}
        />
        <QuickActionsWidget
          profileCompleteness={completenessResult?.score || 0}
          hasResume={!!resume}
          eligibleInterviewCount={eligibleInterviewCount}
          hasSkillGaps={missingSkills.length > 0}
          firstEligibleApplicationId={firstEligibleApp?._id.toString()}
        />
      </div>

      {/* Applications Section */}
      <section
        aria-labelledby="applications-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="applications-heading" className="text-xl font-semibold">
          Applications
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
              </div>
              {app.lastEventStatus && (
                <p className="mt-2 text-[10px] text-neutral-500">
                  Last update: {app.lastEventStatus} on{' '}
                  {app.lastEventAt?.toLocaleDateString()}
                </p>
              )}
              <div className="mt-3 flex gap-3">
                <Link
                  href={`/applications/${app._id}`}
                  className="btn-outline px-3 py-1.5 text-xs"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkillsGapWidget missingSkills={missingSkills} />
        <MatchDistributionChart
          distribution={matchDistribution}
          totalJobs={enriched.length}
        />
      </div>

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

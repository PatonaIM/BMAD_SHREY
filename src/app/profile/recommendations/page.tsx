import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { redirect } from 'next/navigation';
import { findUserByEmail } from '../../../data-access/repositories/userRepo';
import { getExtractedProfile } from '../../../data-access/repositories/extractedProfileRepo';
import { computeCompleteness } from '../../../services/profile/completenessScoring';
import { ProfileEditingService } from '../../../services/profile/profileEditingService';
import { generateProfileRecommendations } from '../../../services/ai/profileRecommendationsService';
import Link from 'next/link';
import type { EditableProfile } from '../../../shared/types/profileEditing';

export default async function ProfileRecommendationsPage() {
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;

  if (!userSession?.email) {
    redirect(`/login?redirect=/profile/recommendations`);
  }

  // Get user ID for profile lookup
  let userId: string | null = null;
  if (userSession.id) {
    userId = userSession.id;
  } else {
    const user = await findUserByEmail(userSession.email);
    userId = user?._id || null;
  }

  if (!userId) {
    redirect('/profile/resume');
  }

  // Fetch profile data
  const extractedProfile = await getExtractedProfile(userId);

  // Get the most recent profile (same logic as dashboard)
  let profile: EditableProfile | null = extractedProfile;
  if (profile && userId) {
    const editingService = new ProfileEditingService(userId);
    const versionsRes = await editingService.list(1);
    if (versionsRes.ok && versionsRes.value.length && versionsRes.value[0]) {
      profile = versionsRes.value[0].profile;
    }
  }

  if (!profile) {
    redirect('/profile/resume');
  }

  // Calculate profile completeness
  const completenessCalc = computeCompleteness(profile);
  const completenessResult = completenessCalc.ok
    ? completenessCalc.value
    : null;

  // Generate AI-powered recommendations
  const recommendations = await generateProfileRecommendations(
    profile,
    completenessResult
  );

  const formatSectionName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getBandColor = (band: string) => {
    const colors = {
      poor: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
      fair: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
      good: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
      excellent:
        'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
    };
    return colors[band as keyof typeof colors] || colors.fair;
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Profile Recommendations
          </h1>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 ml-9">
          AI-powered insights to optimize your profile and improve job matches
        </p>
      </header>

      {/* Overall Score Summary */}
      {completenessResult && (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Overall Profile Score</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Your current profile completeness rating
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${getBandColor(completenessResult.band)}`}
            >
              {completenessResult.band.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-neutral-900 dark:text-neutral-100">
              {completenessResult.score}%
            </div>
            <div className="flex-1">
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    completenessResult.score >= 85
                      ? 'bg-green-500 dark:bg-green-600'
                      : completenessResult.score >= 65
                        ? 'bg-yellow-500 dark:bg-yellow-600'
                        : completenessResult.score >= 40
                          ? 'bg-orange-500 dark:bg-orange-600'
                          : 'bg-red-500 dark:bg-red-600'
                  }`}
                  style={{ width: `${completenessResult.score}%` }}
                />
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                {completenessResult.score >= 85
                  ? 'Excellent! Your profile is well-optimized for job matching.'
                  : completenessResult.score >= 65
                    ? 'Good progress! A few improvements can make your profile stand out.'
                    : completenessResult.score >= 40
                      ? 'Keep going! Complete more sections to increase your visibility.'
                      : 'Just getting started. Complete key sections to improve your matches.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section Breakdown */}
      {completenessResult && (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Section Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(completenessResult.breakdown).map(
              ([section, sectionScore]) => {
                const percentage = Math.round(sectionScore * 100);
                return (
                  <div key={section}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {formatSectionName(section)}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          percentage >= 70
                            ? 'text-green-600 dark:text-green-400'
                            : percentage >= 40
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          percentage >= 70
                            ? 'bg-green-500 dark:bg-green-600'
                            : percentage >= 40
                              ? 'bg-yellow-500 dark:bg-yellow-600'
                              : 'bg-red-500 dark:bg-red-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}

      {/* AI-Powered Recommendations */}
      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="rounded-full bg-brand-primary/10 p-2">
            <svg
              className="w-6 h-6 text-brand-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              AI-Powered Recommendations
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Personalized suggestions based on your profile and industry best
              practices
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {recommendations.sections.map(
            (
              section: {
                title: string;
                items: Array<{
                  recommendation: string;
                  reason: string;
                  example?: string;
                }>;
              },
              idx: number
            ) => (
              <div
                key={idx}
                className="border-l-4 border-brand-primary pl-6 py-2"
              >
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  {section.title}
                </h3>
                <div className="space-y-4">
                  {section.items.map(
                    (
                      item: {
                        recommendation: string;
                        reason: string;
                        example?: string;
                      },
                      itemIdx: number
                    ) => (
                      <div key={itemIdx} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-brand-primary mt-1">
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {item.recommendation}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                              {item.reason}
                            </p>
                            {item.example && (
                              <div className="mt-3 p-3 rounded-md bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                  Example:
                                </p>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">
                                  {item.example}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex gap-4 pb-8">
        <Link
          href="/profile/edit"
          className="btn-primary px-6 py-3 text-sm flex-1 justify-center"
        >
          Edit Profile Now
        </Link>
        <Link
          href="/dashboard"
          className="btn-outline px-6 py-3 text-sm flex-1 justify-center"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

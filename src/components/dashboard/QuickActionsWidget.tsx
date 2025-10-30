'use client';

import Link from 'next/link';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'accent';
  show: boolean;
}

interface QuickActionsWidgetProps {
  profileCompleteness: number;
  hasResume: boolean;
  eligibleInterviewCount: number;
  hasSkillGaps: boolean;
}

export function QuickActionsWidget({
  profileCompleteness,
  hasResume,
  eligibleInterviewCount,
  hasSkillGaps,
}: QuickActionsWidgetProps) {
  const actions: QuickAction[] = [
    {
      id: 'complete-profile',
      title: 'Complete Your Profile',
      description: `Your profile is ${profileCompleteness}% complete`,
      href: '/profile/edit',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      variant: 'primary',
      show: profileCompleteness < 85,
    },
    {
      id: 'upload-resume',
      title: 'Upload Your Resume',
      description: 'Get started by uploading your resume',
      href: '/resume',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
      variant: 'primary',
      show: !hasResume,
    },
    {
      id: 'ai-interview',
      title: 'Boost Your Applications',
      description: `${eligibleInterviewCount} ${eligibleInterviewCount === 1 ? 'application' : 'applications'} can be boosted`,
      href: '/applications?filter=eligible-interview',
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
      variant: 'accent',
      show: eligibleInterviewCount > 0,
    },
    {
      id: 'update-skills',
      title: 'Update Your Skills',
      description: 'Add missing skills from top jobs',
      href: '/profile/edit?section=skills',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      variant: 'secondary',
      show: hasSkillGaps,
    },
  ];

  const visibleActions = actions.filter(action => action.show);

  if (visibleActions.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-950/30">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              All Set!
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Your profile is complete
            </p>
          </div>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Keep applying to jobs and you'll be notified of any opportunities to
          improve your applications.
        </p>
      </div>
    );
  }

  const getVariantClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'border-brand-primary/20 dark:border-brand-primary/30 bg-brand-primary/5 dark:bg-brand-primary/10 hover:bg-brand-primary/10 dark:hover:bg-brand-primary/20';
      case 'accent':
        return 'border-brand-secondary/20 dark:border-brand-secondary/30 bg-brand-secondary/5 dark:bg-brand-secondary/10 hover:bg-brand-secondary/10 dark:hover:bg-brand-secondary/20';
      case 'secondary':
        return 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800';
    }
  };

  const getIconColor = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'text-brand-primary';
      case 'accent':
        return 'text-brand-secondary';
      case 'secondary':
        return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-brand-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Quick Actions
        </h3>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        Recommended actions to improve your job search
      </p>
      <div className="space-y-3">
        {visibleActions.map(action => (
          <Link
            key={action.id}
            href={action.href}
            className={`block p-4 rounded-lg border transition-colors ${getVariantClasses(action.variant)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 ${getIconColor(action.variant)}`}>
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {action.title}
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {action.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-neutral-400 dark:text-neutral-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

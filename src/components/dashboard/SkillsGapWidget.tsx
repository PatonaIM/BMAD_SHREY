'use client';

interface Skill {
  name: string;
  demand: number; // Number of jobs requiring this skill
  currentLevel?: string; // User's current proficiency level
}

interface SkillsGapWidgetProps {
  missingSkills: Skill[];
  isLoading?: boolean;
}

export function SkillsGapWidget({
  missingSkills,
  isLoading = false,
}: SkillsGapWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-16 bg-neutral-100 dark:bg-neutral-800/50 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (missingSkills.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
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
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Skills Match
          </h3>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Great! Your skills align well with available jobs. Keep your profile
          updated as new opportunities arise.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-orange-600 dark:text-orange-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Skills to Add
          </h3>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">
          Top {Math.min(5, missingSkills.length)} skills
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        Adding these skills could improve your match scores
      </p>
      <div className="space-y-3">
        {missingSkills.slice(0, 5).map((skill, index) => (
          <div
            key={skill.name}
            className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary font-semibold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {skill.name}
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Required by {skill.demand}{' '}
                  {skill.demand === 1 ? 'job' : 'jobs'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {skill.demand >= 3 && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 rounded-full">
                  High demand
                </span>
              )}
              <svg
                className="w-5 h-5 text-neutral-400 dark:text-neutral-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <a
          href="/profile/edit?section=skills"
          className="btn-outline w-full justify-center px-4 py-2 text-sm"
        >
          Update Skills
        </a>
      </div>
    </div>
  );
}

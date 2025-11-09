'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { ApplyButton } from '../ApplyButton';
import { BatchMatchProvider, BatchJobMatchScore } from '../BatchJobMatchScore';

export default function JobsGrid({
  jobs,
  hasProfile,
}: {
  jobs: Array<{
    _id: string;
    workableId?: string;
    title: string;
    company: string;
    location?: string;
    employmentType?: string;
    experienceLevel?: string;
    description: string;
    skills: string[];
    salary?: {
      min?: string;
      max?: string;
      currency?: string;
    };
    score?: number;
    semanticScore?: number;
  }>;
  hasProfile: boolean;
}) {
  // Cache semantic scores in localStorage for modal access
  useEffect(() => {
    const jobsWithSemanticScores = jobs.filter(
      j => j.semanticScore !== undefined
    );
    if (jobsWithSemanticScores.length > 0) {
      const cacheKey = 'semanticScores';
      const cached = localStorage.getItem(cacheKey);
      const cacheData = cached ? JSON.parse(cached) : {};

      jobsWithSemanticScores.forEach(job => {
        const jobId = job.workableId || job._id;
        cacheData[jobId] = {
          semantic: job.semanticScore,
          timestamp: Date.now(),
        };
      });

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }
  }, [jobs]);

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
          No jobs found matching your criteria
        </p>
        <Link href="/jobs" className="btn-primary px-6 py-2 text-sm">
          View All Jobs
        </Link>
      </div>
    );
  }

  return (
    <BatchMatchProvider jobIds={jobs.map(j => j.workableId || j._id)}>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {jobs.map(job => {
          const jobIdentifier = job.workableId || job._id;
          return (
            <div
              key={job._id}
              className="card p-5 flex flex-col h-full hover:shadow-lg transition-shadow"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                  {job.title}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                  {job.company}
                </p>

                <div className="space-y-1 mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {job.location && (
                    <p className="flex items-center gap-1">
                      <span>📍</span>
                      <span>{job.location}</span>
                    </p>
                  )}
                  {job.employmentType && (
                    <p className="flex items-center gap-1">
                      <span>💼</span>
                      <span>
                        {job.employmentType
                          .split('-')
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')}
                      </span>
                    </p>
                  )}
                  {job.experienceLevel && (
                    <p className="flex items-center gap-1">
                      <span>📊</span>
                      <span>
                        {job.experienceLevel.charAt(0).toUpperCase() +
                          job.experienceLevel.slice(1)}
                      </span>
                    </p>
                  )}
                </div>

                {job.salary?.min && (
                  <p className="text-xs font-medium text-brand-primary mb-3">
                    {job.salary.min}
                    {job.salary.max && ` - ${job.salary.max}`}{' '}
                    {job.salary.currency || 'USD'}
                  </p>
                )}

                <p className="text-xs leading-relaxed mb-3 line-clamp-3 text-neutral-600 dark:text-neutral-300">
                  {job.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {job.skills.slice(0, 4).map(skill => (
                    <span key={skill} className="badge text-[10px] px-2 py-0.5">
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 4 && (
                    <span className="badge text-[10px] px-2 py-0.5">
                      +{job.skills.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {hasProfile && job.semanticScore !== undefined && (
                  <div className="text-xs font-medium text-center py-1 bg-brand-primary/10 rounded">
                    Semantic Match: {Math.round(job.semanticScore)}%
                  </div>
                )}
                {hasProfile && !job.semanticScore && (
                  <BatchJobMatchScore
                    jobId={jobIdentifier}
                    jobTitle={job.title}
                  />
                )}
                <div className="flex gap-2">
                  <ApplyButton jobId={jobIdentifier} />
                  <Link
                    href={`/jobs/${jobIdentifier}`}
                    className="btn-outline px-4 py-2 text-xs flex-1 text-center"
                    prefetch
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </BatchMatchProvider>
  );
}

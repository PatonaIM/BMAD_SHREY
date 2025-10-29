import type { Job } from '../shared/types/job';

/**
 * Build JSON-LD structured data for a list of jobs using schema.org JobPosting.
 * We intentionally keep fields minimal for initial SEO rollout.
 */
export function buildJobsJsonLd(jobs: Job[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': jobs.map(job => ({
      '@type': 'JobPosting',
      identifier: job.workableId || job._id,
      title: job.title,
      description: job.description.slice(0, 5000), // avoid extremely long payloads
      datePosted: job.postedAt.toISOString(),
      employmentType: job.employmentType,
      hiringOrganization: {
        '@type': 'Organization',
        name: job.company,
        description: job.companyDescription,
      },
      jobLocation: job.location
        ? {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.location,
            },
          }
        : undefined,
      validThrough: job.closedAt ? job.closedAt.toISOString() : undefined,
    })),
  };
}

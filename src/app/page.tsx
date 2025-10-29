import React from 'react';
import { jobRepo } from '../data-access/repositories/jobRepo';
import { buildJobsJsonLd } from '../seo/jobJsonLd';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import type { Metadata } from 'next';
import { Hero } from '../components/Hero';
import { ApplyButton } from '../components/ApplyButton';
import { ScrollReveal } from '../components/scrollReveal';

export const metadata: Metadata = {
  title: 'Teamified | Discover Open Roles',
  description:
    'Explore open positions synced from Workable. Search by keyword, location, experience level and apply to roles that match your skills.',
  openGraph: {
    title: 'Teamified Careers',
    description:
      'Browse active job openings aggregated via our Workable integration and find your next role.',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Teamified',
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL,
  },
  other: {
    // dynamic rel prev/next inserted later (can't at build time)
  },
};

type RawSearchParams = Record<string, string | string[] | undefined>;
interface HomePageProps {
  searchParams?: Promise<RawSearchParams>; // Next.js v15 provides searchParams as Promise
}

const EXPERIENCE_LEVELS = [
  'entry',
  'mid',
  'senior',
  'lead',
  'executive',
] as const;
const EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'temporary',
  'internship',
] as const;
const PAGE_SIZES = [10, 25, 50] as const;

function parseSearchParams(searchParams: RawSearchParams | undefined) {
  const get = (name: string) => {
    const v = searchParams?.[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const rawPage = get('page');
  const pageNum = rawPage ? parseInt(rawPage, 10) : 1;
  const page = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  const rawLimit = get('limit');
  const limitNum = rawLimit ? parseInt(rawLimit, 10) : 25;
  const limit = PAGE_SIZES.includes(limitNum as (typeof PAGE_SIZES)[number])
    ? (limitNum as (typeof PAGE_SIZES)[number])
    : 25;
  const rawExperience = get('experienceLevel');
  const experienceLevel = EXPERIENCE_LEVELS.includes(
    rawExperience as (typeof EXPERIENCE_LEVELS)[number]
  )
    ? (rawExperience as (typeof EXPERIENCE_LEVELS)[number])
    : undefined;
  const rawEmployment = get('employmentType');
  const employmentType = EMPLOYMENT_TYPES.includes(
    rawEmployment as (typeof EMPLOYMENT_TYPES)[number]
  )
    ? (rawEmployment as (typeof EMPLOYMENT_TYPES)[number])
    : undefined;
  return {
    keyword: get('keyword') || undefined,
    location: get('location') || undefined,
    experienceLevel,
    employmentType,
    page,
    limit,
  };
}

export default async function HomePage({
  searchParams,
}: HomePageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined; // Next.js v15 async searchParams support
  const filters = parseSearchParams(resolvedSearchParams);
  const session = await getServerSession(authOptions);

  // Fetch jobs (server-side for SEO). If any filter applied use search, else limited active list.
  // Always use search now to enable pagination consistently
  const limit = filters.limit;
  const { jobs, total } = await jobRepo.search({
    keyword: filters.keyword,
    location: filters.location,
    experienceLevel: filters.experienceLevel,
    employmentType: filters.employmentType,
    page: filters.page,
    limit,
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(filters.page, totalPages);

  // JSON-LD structured data
  const jsonLd = buildJobsJsonLd(jobs);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* SEO pagination rel links */}
      {currentPage > 1 && (
        <link rel="prev" href={buildPageHref(currentPage - 1, filters)} />
      )}
      {currentPage < totalPages && (
        <link rel="next" href={buildPageHref(currentPage + 1, filters)} />
      )}
      <main className="px-4 py-8 max-w-5xl mx-auto">
        <Hero session={session} />
        {/* Marketing Sections */}
        <section className="mb-12" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Platform Highlights
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Candidates Matched', value: '3.2k+' },
              { label: 'Avg. Match Score Lift', value: '27%' },
              { label: 'Roles Synced', value: total.toString() },
              { label: 'Avg. Apply Time', value: '< 3m' },
            ].map(item => (
              <ScrollReveal
                key={item.label}
                className="card p-4 flex flex-col items-center gap-1 text-center"
              >
                <span className="text-2xl font-semibold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                  {item.value}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-medium">
                  {item.label}
                </span>
              </ScrollReveal>
            ))}
          </div>
        </section>
        <section className="mb-12" aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading" className="text-xl font-semibold mb-6">
            What People Are Saying
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote: 'The matching insights saved hours of manual screening.',
                author: 'Senior Recruiter',
              },
              {
                quote:
                  'I discovered a role I never would have searched for myself.',
                author: 'Data Engineer Candidate',
              },
              {
                quote:
                  'Application tracking is clean, fast and keeps me informed.',
                author: 'Product Manager Candidate',
              },
            ].map(t => (
              <ScrollReveal
                key={t.author}
                className="card p-5 flex flex-col gap-3"
              >
                <blockquote className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  “{t.quote}”
                </blockquote>
                <figcaption className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  — {t.author}
                </figcaption>
              </ScrollReveal>
            ))}
          </div>
        </section>
        <section className="mb-16" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="sr-only">
            Join the platform
          </h2>
          <ScrollReveal className="card p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 pointer-events-none" />
            <div className="relative z-10 flex-1">
              <h3 className="text-2xl font-semibold mb-2">
                Ready to find your team?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-prose">
                Create an account to unlock personalized match scores, faster
                applications and updates in real-time.
              </p>
            </div>
            <div className="relative z-10 flex flex-col gap-3">
              {session ? (
                <Link
                  href="/dashboard"
                  className="btn-primary px-6 py-3 text-sm text-center"
                  prefetch
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="btn-primary px-6 py-3 text-sm text-center"
                    prefetch
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/login"
                    className="btn-outline px-6 py-3 text-sm text-center"
                    prefetch
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </ScrollReveal>
        </section>
        <section aria-labelledby="job-filters-heading" className="mb-8">
          <h2 id="job-filters-heading" className="text-xl font-semibold mb-4">
            Search Jobs
          </h2>
          <form
            method="get"
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="keyword" className="text-xs font-medium">
                Keyword
              </label>
              <input
                id="keyword"
                name="keyword"
                defaultValue={filters.keyword || ''}
                placeholder="e.g. frontend, data"
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="location" className="text-xs font-medium">
                Location
              </label>
              <input
                id="location"
                name="location"
                defaultValue={filters.location || ''}
                placeholder="City or Remote"
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="experienceLevel" className="text-xs font-medium">
                Experience Level
              </label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                defaultValue={filters.experienceLevel || ''}
                className="input text-sm"
              >
                <option value="">Any</option>
                {EXPERIENCE_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="employmentType" className="text-xs font-medium">
                Employment Type
              </label>
              <select
                id="employmentType"
                name="employmentType"
                defaultValue={filters.employmentType || ''}
                className="input text-sm"
              >
                <option value="">Any</option>
                {EMPLOYMENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3 col-span-full flex-wrap">
              <div className="flex flex-col gap-1 w-32">
                <label htmlFor="limit" className="text-xs font-medium">
                  Page Size
                </label>
                <select
                  id="limit"
                  name="limit"
                  defaultValue={String(limit)}
                  className="input text-sm"
                >
                  {PAGE_SIZES.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary px-4 py-2 text-sm">
                Apply Filters
              </button>
            </div>
          </form>
        </section>
        <section aria-labelledby="job-results-heading">
          <h2 id="job-results-heading" className="text-xl font-semibold mb-4">
            {jobs.length ? `Open Roles (${jobs.length})` : 'No roles found'}
          </h2>
          <ul className="grid gap-4 list-none p-0 m-0">
            {jobs.map(job => {
              const jobIdentifier = job.workableId || job._id;
              return (
                <li key={job._id} className="card p-4">
                  <h3 className="text-lg font-medium mb-1">{job.title}</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                    <span>{job.company}</span>
                    {job.location && <> • {job.location}</>}
                    {job.employmentType && <> • {job.employmentType}</>}
                    {job.experienceLevel && <> • {job.experienceLevel}</>}
                  </p>
                  {job.salary?.min && (
                    <p className="text-xs mb-2">
                      Salary: {job.salary.min}
                      {job.salary.max && ` - ${job.salary.max}`}{' '}
                      {job.salary.currency || 'USD'}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed mb-3">
                    {job.description.slice(0, 180)}
                    {job.description.length > 180 ? '…' : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {job.skills.slice(0, 6).map(skill => (
                      <span key={skill} className="badge">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <ApplyButton jobId={jobIdentifier} />
                    <Link
                      href={`/jobs/${jobIdentifier}`}
                      className="btn-outline px-4 py-2 text-xs"
                      prefetch
                    >
                      Details
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <p className="text-xs">
              Page {currentPage} of {totalPages}
            </p>
            <nav aria-label="Pagination" className="flex gap-1 flex-wrap">
              <Link
                href={buildPageHref(currentPage - 1, filters)}
                aria-label="Previous page"
                className={`btn-outline px-3 py-1.5 text-xs ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}
              >
                Prev
              </Link>
              {buildPageNumbers(currentPage, totalPages).map(p =>
                p.page ? (
                  <Link
                    key={p.key}
                    href={buildPageHref(p.page, filters)}
                    aria-label={`Go to page ${p.page}`}
                    className={`px-3 py-1.5 text-xs rounded-md border ${p.page === currentPage ? 'bg-brand-primary text-white border-brand-primary' : 'btn-outline'}`}
                  >
                    {p.label}
                  </Link>
                ) : (
                  <span
                    key={p.key}
                    className="px-2 text-xs text-neutral-500 select-none"
                  >
                    {p.label}
                  </span>
                )
              )}
              <Link
                href={buildPageHref(currentPage + 1, filters)}
                aria-label="Next page"
                className={`btn-outline px-3 py-1.5 text-xs ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
              >
                Next
              </Link>
            </nav>
          </div>
        </section>
      </main>
    </>
  );
}

function buildPageHref(
  page: number,
  filters: ReturnType<typeof parseSearchParams>
): string {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.location) params.set('location', filters.location);
  if (filters.experienceLevel)
    params.set('experienceLevel', filters.experienceLevel);
  if (filters.employmentType)
    params.set('employmentType', filters.employmentType);
  if (filters.limit && filters.limit !== 25)
    params.set('limit', String(filters.limit));
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

function buildPageNumbers(
  current: number,
  total: number
): { key: string; page?: number; label: string }[] {
  const pages: number[] = [];
  const window = 2;
  const start = Math.max(1, current - window);
  const end = Math.min(total, current + window);
  for (let p = start; p <= end; p++) pages.push(p);
  const items: { key: string; page?: number; label: string }[] = [];
  if (start > 1) {
    items.push({ key: 'p1', page: 1, label: '1' });
    if (start > 2) items.push({ key: 'el-start', label: '…' });
  }
  pages.forEach(p => items.push({ key: `p${p}`, page: p, label: String(p) }));
  if (end < total) {
    if (end < total - 1) items.push({ key: 'el-end', label: '…' });
    items.push({ key: `p${total}`, page: total, label: String(total) });
  }
  return items;
}

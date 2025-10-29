import React from 'react';
import AuthStatus from '../components/AuthStatus';
import { jobRepo } from '../data-access/repositories/jobRepo';
import { buildJobsJsonLd } from '../seo/jobJsonLd';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Chip,
} from '@mui/material';

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

  // Session to control Apply button behavior
  const session = await getServerSession(authOptions);

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
      <Box component="main" sx={{ px: 4, py: 6, maxWidth: 1100, mx: 'auto' }}>
        <Box component="header" sx={{ mb: 5 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              lineHeight: 1.2,
              mb: 2,
            }}
          >
            Find Your Next Role
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontSize: '1.15rem',
              maxWidth: 720,
              mb: 2,
              color: 'text.secondary',
            }}
          >
            Teamified surfaces curated opportunities synced from our Workable
            ATS integration. Use the search filters to narrow by location,
            experience level, or employment type.
          </Typography>
          <AuthStatus />
        </Box>

        <Box
          component="section"
          aria-labelledby="job-filters-heading"
          sx={{ mb: 4 }}
        >
          <Typography
            id="job-filters-heading"
            variant="h2"
            sx={{ fontSize: '1.5rem', mb: 2 }}
          >
            Search Jobs
          </Typography>
          <Grid
            component="form"
            method="get"
            container
            spacing={2}
            columns={{ xs: 1, sm: 2, md: 12 }}
          >
            <Grid item xs={1} sm={1} md={3}>
              <TextField
                fullWidth
                id="keyword"
                name="keyword"
                label="Keyword"
                defaultValue={filters.keyword || ''}
                placeholder="e.g. frontend, data"
              />
            </Grid>
            <Grid item xs={1} sm={1} md={3}>
              <TextField
                fullWidth
                id="location"
                name="location"
                label="Location"
                defaultValue={filters.location || ''}
                placeholder="City or Remote"
              />
            </Grid>
            <Grid item xs={1} sm={1} md={3}>
              <FormControl fullWidth>
                <InputLabel id="experienceLevel-label">
                  Experience Level
                </InputLabel>
                <Select
                  labelId="experienceLevel-label"
                  id="experienceLevel"
                  name="experienceLevel"
                  label="Experience Level"
                  defaultValue={filters.experienceLevel || ''}
                >
                  <MenuItem value="">Any</MenuItem>
                  {EXPERIENCE_LEVELS.map(lvl => (
                    <MenuItem key={lvl} value={lvl}>
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={1} sm={1} md={3}>
              <FormControl fullWidth>
                <InputLabel id="employmentType-label">
                  Employment Type
                </InputLabel>
                <Select
                  labelId="employmentType-label"
                  id="employmentType"
                  name="employmentType"
                  label="Employment Type"
                  defaultValue={filters.employmentType || ''}
                >
                  <MenuItem value="">Any</MenuItem>
                  {EMPLOYMENT_TYPES.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={1} sm={2} md={12}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="limit-label">Page Size</InputLabel>
                  <Select
                    labelId="limit-label"
                    id="limit"
                    name="limit"
                    label="Page Size"
                    defaultValue={String(limit)}
                  >
                    {PAGE_SIZES.map(size => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ mt: { xs: 1, md: 0 } }}
                >
                  Apply Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box component="section" aria-labelledby="job-results-heading">
          <Typography
            id="job-results-heading"
            variant="h2"
            sx={{ fontSize: '1.5rem', mb: 2 }}
          >
            {jobs.length ? `Open Roles (${jobs.length})` : 'No roles found'}
          </Typography>
          <Box
            component="ul"
            sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 2 }}
          >
            {jobs.map(job => {
              const applyHref = session
                ? `/jobs/${job.workableId || job._id}/apply`
                : `/login?redirect=/jobs/${job.workableId || job._id}/apply`;
              return (
                <Box
                  component="li"
                  key={job._id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography
                    variant="h3"
                    sx={{ fontSize: '1.25rem', mb: 0.5 }}
                  >
                    {job.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mb: 1 }}
                  >
                    <span>{job.company}</span>
                    {job.location && <> • {job.location}</>}
                    {job.employmentType && <> • {job.employmentType}</>}
                    {job.experienceLevel && <> • {job.experienceLevel}</>}
                  </Typography>
                  {job.salary?.min && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Salary: {job.salary.min}
                      {job.salary.max && ` - ${job.salary.max}`}{' '}
                      {job.salary.currency || 'USD'}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                    {job.description.slice(0, 180)}
                    {job.description.length > 180 ? '…' : ''}
                  </Typography>
                  <Box
                    sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}
                  >
                    {job.skills.slice(0, 6).map(skill => (
                      <Chip key={skill} label={skill} size="small" />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      component={Link}
                      href={applyHref}
                      aria-label={`Apply to ${job.title}`}
                      variant="contained"
                      color="primary"
                      prefetch
                    >
                      {session ? 'Apply Now' : 'Login to Apply'}
                    </Button>
                    <Button
                      component={Link}
                      href={`/jobs/${job.workableId || job._id}`}
                      variant="outlined"
                      color="primary"
                      prefetch
                    >
                      Details
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Box
            sx={{
              mt: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2">
              Page {currentPage} of {totalPages}
            </Typography>
            <Box
              sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
              aria-label="Pagination"
            >
              <Button
                component={Link}
                href={buildPageHref(currentPage - 1, filters)}
                variant="outlined"
                size="small"
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                Prev
              </Button>
              {buildPageNumbers(currentPage, totalPages).map(p =>
                p.page ? (
                  <Button
                    key={p.key}
                    component={Link}
                    href={buildPageHref(p.page, filters)}
                    variant={p.page === currentPage ? 'contained' : 'outlined'}
                    size="small"
                    aria-label={`Go to page ${p.page}`}
                  >
                    {p.label}
                  </Button>
                ) : (
                  <Box
                    key={p.key}
                    component="span"
                    sx={{
                      px: 1,
                      color: 'text.disabled',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    aria-hidden="true"
                  >
                    {p.label}
                  </Box>
                )
              )}
              <Button
                component={Link}
                href={buildPageHref(currentPage + 1, filters)}
                variant="outlined"
                size="small"
                disabled={currentPage >= totalPages}
                aria-label="Next page"
              >
                Next
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
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

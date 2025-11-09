import React from 'react';
import Link from 'next/link';
import { jobRepo } from '../../data-access/repositories/jobRepo';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import type { Metadata } from 'next';
import JobsGrid from '../../components/jobs/JobsGrid';
import { JobsFilters } from '../../components/jobs/JobsFilters';
import { getMongoClient } from '../../data-access/mongoClient';

export const metadata: Metadata = {
  title: 'Jobs | Teamified',
  description: 'Browse all available job opportunities at Teamified',
};

type RawSearchParams = Record<string, string | string[] | undefined>;
interface JobsPageProps {
  searchParams?: Promise<RawSearchParams>;
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
const PAGE_SIZES = [12, 24, 48] as const;
const SORT_OPTIONS = ['time', 'score'] as const;

function parseSearchParams(
  searchParams: RawSearchParams | undefined,
  hasProfile: boolean = false
) {
  const get = (name: string) => {
    const v = searchParams?.[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const rawPage = get('page');
  const pageNum = rawPage ? parseInt(rawPage, 10) : 1;
  const page = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  const rawLimit = get('limit');
  const limitNum = rawLimit ? parseInt(rawLimit, 10) : 12;
  const limit = PAGE_SIZES.includes(limitNum as (typeof PAGE_SIZES)[number])
    ? (limitNum as (typeof PAGE_SIZES)[number])
    : 12;
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
  const rawSort = get('sort');
  // Default to 'score' if user has profile and no sort specified, otherwise 'time'
  const defaultSort = hasProfile ? 'score' : 'time';
  const sort =
    rawSort && SORT_OPTIONS.includes(rawSort as (typeof SORT_OPTIONS)[number])
      ? (rawSort as (typeof SORT_OPTIONS)[number])
      : defaultSort;
  return {
    keyword: get('keyword') || undefined,
    location: get('location') || undefined,
    experienceLevel,
    employmentType,
    page,
    limit,
    sort,
  };
}

export default async function JobsPage({
  searchParams,
}: JobsPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await getServerSession(authOptions);

  // Check if user has a profile first
  let hasProfile = false;
  if (session?.user) {
    const client = await getMongoClient();
    const db = client.db();
    const userId = (session.user as { id?: string }).id;

    if (userId) {
      const profile = await db
        .collection('extracted_profiles')
        .findOne({ userId });
      hasProfile = !!profile;
    }
  }

  // Parse filters with dynamic default sort based on profile
  const filters = parseSearchParams(resolvedSearchParams, hasProfile);

  // Declare jobs and total variables
  let jobs: JobWithScore[] = [];
  let total = 0;

  type JobWithScore = Awaited<
    ReturnType<typeof jobRepo.search>
  >['jobs'][number] & {
    score?: number;
  };

  // Debug: Check conditions for vector search
  // eslint-disable-next-line no-console
  console.log('Vector search conditions:', {
    hasProfile,
    sort: filters.sort,
    hasUser: !!session?.user,
    willUseVectorSearch:
      hasProfile && filters.sort === 'score' && !!session?.user,
  });

  // If user has profile and sorting by score, get scored jobs using vector search
  if (hasProfile && filters.sort === 'score' && session?.user) {
    const client = await getMongoClient();
    const db = client.db();
    const userId = (session.user as { id?: string }).id;

    if (userId) {
      // Get candidate's resume vector
      const resumeVectors = await db
        .collection('resume_vectors')
        .find({ userId })
        .sort({ updatedAt: -1 })
        .limit(1)
        .toArray();

      // eslint-disable-next-line no-console
      console.log('Resume vectors found:', {
        count: resumeVectors.length,
        hasEmbeddings: resumeVectors[0]?.embeddings ? 'yes' : 'no',
      });

      if (
        resumeVectors.length > 0 &&
        resumeVectors[0] &&
        resumeVectors[0].embeddings
      ) {
        const candidateVector = resumeVectors[0].embeddings as number[];

        // Use MongoDB vector search for better results
        const jobVectors = db.collection('jobVectors');
        const pipeline: Record<string, unknown>[] = [
          {
            $vectorSearch: {
              index: 'job_vector_index',
              path: 'embedding',
              queryVector: candidateVector,
              numCandidates: 1000,
              limit: 1000, // Get many matches to allow for filtering
            },
          },
          {
            $addFields: {
              vectorScore: { $meta: 'vectorSearchScore' },
            },
          },
          // Lookup job details
          {
            $lookup: {
              from: 'jobs',
              localField: 'jobId',
              foreignField: '_id',
              as: 'job',
            },
          },
          {
            $unwind: '$job',
          },
          // Filter for active jobs only
          {
            $match: {
              'job.status': 'active',
            },
          },
        ];

        // Apply keyword filter if specified
        if (filters.keyword) {
          pipeline.push({
            $match: {
              $or: [
                { 'job.title': { $regex: filters.keyword, $options: 'i' } },
                {
                  'job.description': { $regex: filters.keyword, $options: 'i' },
                },
                { 'job.skills': { $regex: filters.keyword, $options: 'i' } },
              ],
            },
          });
        }

        // Apply location filter if specified
        if (filters.location) {
          pipeline.push({
            $match: {
              'job.location': { $regex: filters.location, $options: 'i' },
            },
          });
        }

        // Apply experience level filter if specified
        if (filters.experienceLevel) {
          pipeline.push({
            $match: {
              'job.experienceLevel': filters.experienceLevel,
            },
          });
        }

        // Apply employment type filter if specified
        if (filters.employmentType) {
          pipeline.push({
            $match: {
              'job.employmentType': filters.employmentType,
            },
          });
        }

        // Project final fields
        pipeline.push({
          $project: {
            _id: '$job._id',
            workableId: '$job.workableId',
            title: '$job.title',
            company: '$job.company',
            location: '$job.location',
            employmentType: '$job.employmentType',
            experienceLevel: '$job.experienceLevel',
            description: '$job.description',
            skills: '$job.skills',
            salary: '$job.salary',
            postedAt: '$job.postedAt',
            vectorScore: '$vectorScore', // Keep raw score for sorting
            score: {
              $multiply: ['$vectorScore', 100], // Convert to percentage
            },
          },
        });

        // Sort by vector score (descending - highest match first)
        pipeline.push({
          $sort: { vectorScore: -1 },
        });

        // Skip for pagination
        if (filters.page > 1) {
          pipeline.push({
            $skip: (filters.page - 1) * filters.limit,
          });
        }

        // Limit results
        pipeline.push({
          $limit: filters.limit,
        });

        const results = await jobVectors.aggregate(pipeline).toArray();

        // Log results for debugging
        // eslint-disable-next-line no-console
        console.log(
          'Vector search results:',
          results.slice(0, 3).map(r => ({
            title: r.title,
            vectorScore: r.vectorScore,
            score: r.score,
          }))
        );

        // Convert to jobs array with scores (maintains sort order)
        jobs = results.map(r => ({
          ...r,
          _id: r._id,
          workableId: r.workableId,
          title: r.title,
          company: r.company,
          location: r.location,
          employmentType: r.employmentType,
          experienceLevel: r.experienceLevel,
          description: r.description,
          skills: r.skills,
          salary: r.salary,
          status: 'active' as const,
          lastSyncedAt: new Date(),
          postedAt: r.postedAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          score: Math.round(r.score * 10) / 10,
          semanticScore: Math.round(r.score * 10) / 10, // Store semantic score separately
        })) as JobWithScore[];

        // Get total count by running a count pipeline with the same filters
        const countPipeline: Record<string, unknown>[] = [
          {
            $vectorSearch: {
              index: 'job_vector_index',
              path: 'embedding',
              queryVector: candidateVector,
              numCandidates: 1000,
              limit: 1000, // Get up to 1000 matches for counting
            },
          },
          {
            $lookup: {
              from: 'jobs',
              localField: 'jobId',
              foreignField: '_id',
              as: 'job',
            },
          },
          {
            $unwind: '$job',
          },
          {
            $match: {
              'job.status': 'active',
            },
          },
        ];

        // Apply same filters as main query
        if (filters.keyword) {
          countPipeline.push({
            $match: {
              $or: [
                { 'job.title': { $regex: filters.keyword, $options: 'i' } },
                {
                  'job.description': { $regex: filters.keyword, $options: 'i' },
                },
                { 'job.skills': { $regex: filters.keyword, $options: 'i' } },
              ],
            },
          });
        }
        if (filters.location) {
          countPipeline.push({
            $match: {
              'job.location': { $regex: filters.location, $options: 'i' },
            },
          });
        }
        if (filters.experienceLevel) {
          countPipeline.push({
            $match: {
              'job.experienceLevel': filters.experienceLevel,
            },
          });
        }
        if (filters.employmentType) {
          countPipeline.push({
            $match: {
              'job.employmentType': filters.employmentType,
            },
          });
        }

        countPipeline.push({ $count: 'total' });

        const countResult = await jobVectors.aggregate(countPipeline).toArray();
        total = countResult[0]?.total || results.length;
      } else {
        // No vector found, fall back to regular search
        const result = await jobRepo.search({
          keyword: filters.keyword,
          location: filters.location,
          experienceLevel: filters.experienceLevel,
          employmentType: filters.employmentType,
          page: filters.page,
          limit: filters.limit,
        });
        jobs = result.jobs;
        total = result.total;
      }
    }
  } else {
    // If not sorting by score or no profile, fetch normally
    const result = await jobRepo.search({
      keyword: filters.keyword,
      location: filters.location,
      experienceLevel: filters.experienceLevel,
      employmentType: filters.employmentType,
      page: filters.page,
      limit: filters.limit,
    });
    jobs = result.jobs;
    total = result.total;
  }

  // Serialize jobs for client component (convert ObjectId and Date to strings)
  const serializedJobs = jobs.map(job => ({
    _id: job._id.toString(),
    workableId: job.workableId,
    title: job.title,
    company: job.company,
    location: job.location,
    employmentType: job.employmentType,
    experienceLevel: job.experienceLevel,
    description: job.description,
    skills: job.skills,
    salary: job.salary
      ? {
          min: job.salary.min?.toString(),
          max: job.salary.max?.toString(),
          currency: job.salary.currency,
        }
      : undefined,
    score: (job as { score?: number }).score,
    semanticScore: (job as { semanticScore?: number }).semanticScore,
  }));

  const totalPages = Math.ceil(total / filters.limit);

  // Build pagination URL helper
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.location) params.set('location', filters.location);
    if (filters.experienceLevel)
      params.set('experienceLevel', filters.experienceLevel);
    if (filters.employmentType)
      params.set('employmentType', filters.employmentType);
    if (filters.limit !== 12) params.set('limit', String(filters.limit));
    if (filters.sort !== (hasProfile ? 'score' : 'time'))
      params.set('sort', filters.sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : '/jobs';
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Jobs</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {hasProfile
            ? 'Jobs matched to your profile'
            : 'Discover your next opportunity'}
        </p>
      </div>

      <JobsFilters
        filters={filters}
        experienceLevels={EXPERIENCE_LEVELS}
        employmentTypes={EMPLOYMENT_TYPES}
        pageSizes={PAGE_SIZES}
        hasProfile={hasProfile}
        isAuthenticated={!!session}
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {total} {total === 1 ? 'job' : 'jobs'} found
        </p>
      </div>

      <JobsGrid jobs={serializedJobs} hasProfile={hasProfile} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Page {filters.page} of {totalPages}
          </p>
          <nav aria-label="Pagination" className="flex gap-2">
            <Link
              href={buildPageUrl(filters.page - 1)}
              aria-label="Previous page"
              className={`btn-outline px-4 py-2 text-sm ${filters.page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
            >
              Previous
            </Link>
            <Link
              href={buildPageUrl(filters.page + 1)}
              aria-label="Next page"
              className={`btn-outline px-4 py-2 text-sm ${filters.page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
            >
              Next
            </Link>
          </nav>
        </div>
      )}
    </main>
  );
}

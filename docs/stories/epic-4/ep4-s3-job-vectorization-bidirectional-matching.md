# Story: Job Vectorization & Bidirectional AI Matching

**Story ID**: EP4-S3  
**Epic**: Epic 4 - Recruiter Tools  
**Priority**: P0 (Blocker for AI Suggestions)  
**Estimated Effort**: 3 days  
**Status**: Draft  
**Created**: 2025-11-08

---

## 📋 Story Overview

**As a** system  
**I want to** generate and store vector embeddings for job descriptions  
**So that** we can provide AI-powered bidirectional matching:

- Candidates see best matching jobs for their profile
- Recruiters see best matching candidates for their jobs

---

## 🎯 Business Value

### Current State

- ✅ Candidate resumes ARE vectorized (`resumeVectors` collection exists)
- ❌ Job descriptions are NOT vectorized
- ❌ Semantic similarity scoring is DISABLED (returns 0%)
- ❌ Candidates cannot see AI-recommended jobs
- ⚠️ Recruiter candidate suggestions use vector search BUT job embeddings are generated on-the-fly (slow, not cached)

### Target State

- ✅ Jobs have pre-computed embeddings stored in database
- ✅ MongoDB Atlas Vector Search indexes on both jobs and resumeVectors
- ✅ Fast semantic matching (<100ms) using vector similarity
- ✅ Bidirectional recommendations:
  - **Candidates**: "Top 10 jobs for you" on dashboard
  - **Recruiters**: "Top 20 candidates for this job" (already has UI, needs optimization)

---

## 📐 Technical Architecture

### Current Implementation Analysis

**Resume Vectorization** ✅ (Already Exists)

```typescript
// Service: src/services/ai/resumeVectorization.ts
// Repo: src/data-access/repositories/resumeVectorRepo.ts
// Collection: resumeVectors
// Model: text-embedding-3-small (1536 dimensions)
// Index: resume_vector_index (used in candidateMatchingRepo)
```

**Job Vectorization** ❌ (Missing - This Story)

```typescript
// Job type has embeddingVersion field but NO embedding field
// Jobs are vectorized on-the-fly in jobCandidateMatching.ts (line 186)
// generateJobEmbedding() returns dummy data currently (line 319)
```

**Matching Services**

```typescript
// src/services/ai/jobCandidateMatching.ts
// - calculateSemanticSimilarity() exists but disabled (weight = 0%)
// - generateJobEmbedding() needs real implementation

// src/data-access/repositories/candidateMatchingRepo.ts
// - findProactiveMatches() uses job.embedding (doesn't exist yet!)
// - Uses MongoDB $vectorSearch with resume_vector_index
```

---

## 🔧 Implementation Tasks

### Task 1: Create JobVectorizationService (Day 1 - 6 hours)

**File**: `src/services/ai/jobVectorization.ts`

**Implementation** (mirror `resumeVectorization.ts` structure):

```typescript
import { getOpenAI } from '../../ai/openai/client';
import { logger } from '../../monitoring/logger';
import { ok, err, type Result } from '../../shared/result';
import type { Job } from '../../shared/types/job';

export interface JobVector {
  _id: string;
  jobId: string; // Reference to jobs._id
  embedding: number[]; // 1536-dimensional vector
  version: number; // Track embedding model version
  metadata: {
    title: string;
    company: string;
    location?: string;
    skills: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export class JobVectorizationService {
  private readonly embeddingModel = 'text-embedding-3-small';

  /**
   * Vectorize a job posting
   */
  async vectorizeJob(
    jobId: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<Result<JobVector, string>> {
    // 1. Fetch job from jobs collection
    // 2. Check if vector already exists (unless forceRefresh)
    // 3. Prepare text content for embedding
    // 4. Call OpenAI embeddings API
    // 5. Store in jobVectors collection
    // 6. Return JobVector
  }

  /**
   * Prepare job text for vectorization
   * Combine: title, description, requirements, skills, location
   */
  private prepareJobContent(job: Job): string {
    const sections: string[] = [];

    sections.push(`Job Title: ${job.title}`);
    sections.push(`Company: ${job.company}`);

    if (job.description) {
      sections.push(`Description: ${job.description}`);
    }

    if (job.requirements) {
      sections.push(`Requirements: ${job.requirements}`);
    }

    if (job.skills.length > 0) {
      sections.push(`Required Skills: ${job.skills.join(', ')}`);
    }

    if (job.location) {
      sections.push(`Location: ${job.location}`);
    }

    if (job.experienceLevel) {
      sections.push(`Experience Level: ${job.experienceLevel}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(
    content: string
  ): Promise<Result<number[], string>> {
    const openai = await getOpenAI();

    const response = await openai.embeddings.create({
      model: this.embeddingModel,
      input: content,
    });

    return ok(response.data[0].embedding);
  }

  /**
   * Batch vectorize multiple jobs (for initial setup or sync)
   */
  async batchVectorizeJobs(
    jobIds: string[],
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<Result<{ successful: number; failed: number }, string>> {
    // Process in batches to avoid rate limits
    // Default: 10 jobs per batch, 1 second delay between batches
  }
}

export const jobVectorizationService = new JobVectorizationService();
```

**Repository**: `src/data-access/repositories/jobVectorRepo.ts`

```typescript
import { getMongoClient } from '../mongoClient';
import type { JobVector } from '../../services/ai/jobVectorization';

export class JobVectorRepository {
  private async getCollection() {
    const client = await getMongoClient();
    return client.db().collection<JobVector>('jobVectors');
  }

  async create(vector: Omit<JobVector, '_id'>): Promise<JobVector> {
    const collection = await this.getCollection();
    const result = await collection.insertOne(vector as JobVector);
    return { ...vector, _id: result.insertedId.toString() } as JobVector;
  }

  async getByJobId(jobId: string): Promise<JobVector | null> {
    const collection = await this.getCollection();
    return collection.findOne({ jobId });
  }

  async deleteByJobId(jobId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ jobId });
    return result.deletedCount > 0;
  }
}

export const jobVectorRepo = new JobVectorRepository();
```

**Subtasks**:

- [ ] Create `JobVectorizationService` class
- [ ] Create `JobVectorRepository` class
- [ ] Add unit tests for content preparation
- [ ] Add integration test with OpenAI API (mocked)

---

### Task 2: Create MongoDB Vector Search Indexes (Day 1 - 2 hours)

**Migration Script**: `scripts/migrations/create-vector-indexes.ts`

```typescript
import { getMongoClient } from '../../src/data-access/mongoClient';
import { logger } from '../../src/monitoring/logger';

async function createVectorSearchIndexes() {
  const client = await getMongoClient();
  const db = client.db();

  // Index 1: Resume Vector Index (verify exists)
  const resumeVectors = db.collection('resumeVectors');
  await resumeVectors.createIndex(
    { embedding: 1 },
    {
      name: 'resume_vector_index',
      // MongoDB Atlas Vector Search configuration
    }
  );

  // Index 2: Job Vector Index (NEW)
  const jobVectors = db.collection('jobVectors');
  await jobVectors.createIndex(
    { embedding: 1 },
    {
      name: 'job_vector_index',
      // MongoDB Atlas Vector Search configuration
    }
  );

  // Index 3: Job reference index
  await jobVectors.createIndex({ jobId: 1 }, { unique: true });

  logger.info('Vector search indexes created successfully');
}

createVectorSearchIndexes().catch(console.error);
```

**MongoDB Atlas Setup** (Manual - Document in Story):

1. Navigate to MongoDB Atlas → Database → Search Indexes
2. Create Vector Search Index on `jobVectors.embedding`
   - Type: `vectorSearch`
   - Path: `embedding`
   - Dimensions: `1536`
   - Similarity: `cosine`
3. Wait for index to build (~5-10 minutes)

**Subtasks**:

- [ ] Create migration script
- [ ] Document Atlas Vector Search setup steps
- [ ] Create index for `jobVectors` collection
- [ ] Verify `resumeVectors` index exists
- [ ] Test vector search queries

---

### Task 3: Update Job Model & Sync Jobs (Day 2 - 4 hours)

**Update Job Type**: `src/shared/types/job.ts`

```typescript
export interface Job {
  // ... existing fields ...

  // Vector Search Fields
  embedding?: number[]; // 1536-dimensional vector (optional for backwards compatibility)
  embeddingVersion?: number; // Track which model version generated this
  lastVectorizedAt?: Date; // When was this job last vectorized

  // ... rest of fields ...
}
```

**Add Vectorization to Job Creation Flow**:

```typescript
// src/data-access/repositories/jobRepo.ts

async create(jobData: Omit<Job, '_id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
  // ... existing creation logic ...

  // Queue job for vectorization (async, don't wait)
  jobVectorizationService.vectorizeJob(job._id).catch(err => {
    logger.error({ msg: 'Failed to vectorize new job', jobId: job._id, error: err });
  });

  return job;
}

async update(workableId: string, updates: Partial<Job>): Promise<Job | null> {
  // ... existing update logic ...

  // If job content changed, re-vectorize
  if (updates.description || updates.requirements || updates.skills) {
    jobVectorizationService.vectorizeJob(job._id, { forceRefresh: true }).catch(err => {
      logger.error({ msg: 'Failed to re-vectorize updated job', jobId: job._id, error: err });
    });
  }

  return job;
}
```

**Batch Vectorize Existing Jobs** (One-time script):

```typescript
// scripts/vectorize-existing-jobs.ts

async function vectorizeAllJobs() {
  const jobs = await jobRepo.findAll({ status: 'active' });
  console.log(`Found ${jobs.length} active jobs to vectorize`);

  const result = await jobVectorizationService.batchVectorizeJobs(
    jobs.map(j => j._id),
    { batchSize: 10, delayMs: 1000 } // Rate limit friendly
  );

  console.log(
    `Vectorization complete: ${result.successful} successful, ${result.failed} failed`
  );
}
```

**Subtasks**:

- [ ] Update Job type definition
- [ ] Add vectorization to job creation
- [ ] Add vectorization to job updates
- [ ] Create batch vectorization script
- [ ] Run batch vectorization on existing jobs
- [ ] Monitor OpenAI API costs

---

### Task 4: Update Candidate Matching to Use Cached Job Vectors (Day 2 - 3 hours)

**Update**: `src/data-access/repositories/candidateMatchingRepo.ts`

```typescript
async findProactiveMatches(
  jobId: string,
  filters: SuggestedCandidatesFilters = {},
  limit: number = 20
): Promise<CandidateSuggestion[]> {
  const client = await getMongoClient();
  const db = client.db();
  const jobs = db.collection('jobs');
  const resumeVectors = db.collection('resumeVectors');
  const jobVectors = db.collection('jobVectors'); // NEW

  // Get job vector (cached, not on-the-fly!)
  const jobVector = await jobVectors.findOne({ jobId: new ObjectId(jobId) });

  if (!jobVector || !jobVector.embedding) {
    logger.warn({
      msg: 'Job has no vector embedding - triggering vectorization',
      jobId
    });

    // Trigger async vectorization for future requests
    jobVectorizationService.vectorizeJob(jobId).catch(err => {
      logger.error({ msg: 'Failed to vectorize job', jobId, error: err });
    });

    // Fall back to non-semantic matching for this request
    return this.findProactiveMatchesWithoutVectors(jobId, filters, limit);
  }

  // Use cached job embedding for vector search
  const pipeline = [
    {
      $vectorSearch: {
        index: 'resume_vector_index',
        path: 'embedding',
        queryVector: jobVector.embedding, // Use cached vector!
        numCandidates: 100,
        limit: limit * 2,
      },
    },
    // ... rest of pipeline ...
  ];

  const results = await resumeVectors.aggregate(pipeline).toArray();

  // ... rest of matching logic ...
}
```

**Subtasks**:

- [ ] Update `findProactiveMatches` to use `jobVectors` collection
- [ ] Add fallback for jobs without vectors
- [ ] Trigger async vectorization for missing vectors
- [ ] Update error handling
- [ ] Add performance logging

---

### Task 5: Enable Semantic Similarity in Match Scoring (Day 2 - 2 hours)

**Update**: `src/services/ai/jobCandidateMatching.ts`

```typescript
export class JobCandidateMatchingService {
  private readonly defaultWeights: MatchWeights = {
    semantic: 0.35, // ENABLED! (was 0.0)
    skills: 0.4, // Reduced from 0.6
    experience: 0.15, // Reduced from 0.25
    other: 0.1, // Reduced from 0.15
  };

  /**
   * Calculate semantic similarity using CACHED vector embeddings
   */
  private async calculateSemanticSimilarity(
    job: Job,
    candidate: CandidateProfile
  ): Promise<number> {
    try {
      // Check if candidate has vector
      if (!candidate.vector || candidate.vector.length === 0) {
        return 0;
      }

      // Get CACHED job vector (don't generate on-the-fly!)
      const jobVector = await jobVectorRepo.getByJobId(job._id);

      if (!jobVector || !jobVector.embedding) {
        logger.warn({
          msg: 'Job has no cached vector for semantic matching',
          jobId: job._id,
        });

        // Trigger async vectorization
        jobVectorizationService.vectorizeJob(job._id).catch(() => {});

        return 0; // Return 0 for this calculation
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(
        candidate.vector,
        jobVector.embedding // Use cached vector!
      );

      return Math.max(0, Math.min(1, similarity));
    } catch (error) {
      logger.error({
        msg: 'Semantic similarity calculation failed',
        jobId: job._id,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  // REMOVE generateJobEmbedding() method (no longer needed!)
  // REMOVE prepareJobTextForEmbedding() method (moved to jobVectorization service)
}
```

**Subtasks**:

- [ ] Update semantic weight to 35%
- [ ] Use cached job vectors
- [ ] Remove on-the-fly embedding generation
- [ ] Add performance metrics
- [ ] Update tests

---

### Task 6: Create Candidate Job Recommendations Endpoint (Day 3 - 4 hours)

**New tRPC Procedure**: `src/services/trpc/candidateRouter.ts`

```typescript
export const candidateRouter = t.router({
  /**
   * Get AI-recommended jobs for the logged-in candidate
   */
  getRecommendedJobs: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        minScore: z.number().min(0).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        // Get candidate's resume vector
        const resumeVector = await resumeVectorRepo.getByUserId(userId);

        if (!resumeVector || !resumeVector.embedding) {
          return {
            jobs: [],
            message: 'Please complete your profile to see job recommendations',
          };
        }

        // Vector search on jobVectors collection
        const client = await getMongoClient();
        const db = client.db();
        const jobVectors = db.collection('jobVectors');

        const pipeline = [
          {
            $vectorSearch: {
              index: 'job_vector_index',
              path: 'embedding',
              queryVector: resumeVector.embedding,
              numCandidates: 100,
              limit: input.limit * 2,
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
              'job.status': 'active', // Only active jobs
            },
          },
          {
            $project: {
              _id: 1,
              jobId: 1,
              job: 1,
              matchScore: { $meta: 'vectorSearchScore' },
            },
          },
          {
            $limit: input.limit,
          },
        ];

        const results = await jobVectors.aggregate(pipeline).toArray();

        const recommendations = results.map(result => ({
          job: result.job,
          matchScore: Math.round(result.matchScore * 100),
          matchReasons: [], // TODO: Generate reasons
        }));

        // Filter by minScore if specified
        const filtered = input.minScore
          ? recommendations.filter(r => r.matchScore >= input.minScore)
          : recommendations;

        return {
          jobs: filtered,
          count: filtered.length,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get job recommendations: ${(err as Error).message}`,
        });
      }
    }),
});
```

**Subtasks**:

- [ ] Create `getRecommendedJobs` procedure
- [ ] Add vector search on `jobVectors` collection
- [ ] Add filtering for active jobs
- [ ] Calculate match scores
- [ ] Add error handling

---

### Task 7: Create Candidate Dashboard Job Recommendations UI (Day 3 - 4 hours)

**Component**: `src/components/candidate/recommendations/JobRecommendations.tsx`

```typescript
'use client';

import { trpc } from '@/services/trpc/client';
import { Sparkles, Briefcase, MapPin, DollarSign } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/OptimisticLoader';

export function JobRecommendations() {
  const { data, isLoading, error } = trpc.candidate.getRecommendedJobs.useQuery({
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Failed to load recommendations</p>
      </div>
    );
  }

  if (!data?.jobs || data.jobs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Sparkles className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No recommendations yet
        </h3>
        <p className="text-sm text-gray-500">
          Complete your profile to see AI-powered job recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            AI-Recommended Jobs
          </h2>
          <p className="text-sm text-gray-500">
            {data.count} job{data.count !== 1 ? 's' : ''} matching your profile
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {data.jobs.map(({ job, matchScore }) => (
          <div
            key={job._id}
            className="rounded-lg border border-gray-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {job.title}
                </h3>
                <p className="text-sm text-gray-600">{job.company}</p>
              </div>
              <div className="flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {matchScore}% match
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              {job.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </div>
              )}
              {job.employmentType && (
                <div className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {job.employmentType}
                </div>
              )}
              {job.salary && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {job.salary.min}-{job.salary.max}K
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                View Details
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
              >
                Apply Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Add to Candidate Dashboard**: `src/app/candidate/dashboard/page.tsx`

```typescript
import { JobRecommendations } from '@/components/candidate/recommendations/JobRecommendations';

export default function CandidateDashboard() {
  return (
    <div className="space-y-8">
      {/* Existing dashboard sections */}

      {/* NEW: AI Job Recommendations */}
      <JobRecommendations />
    </div>
  );
}
```

**Subtasks**:

- [ ] Create `JobRecommendations` component
- [ ] Create `JobRecommendationCard` component
- [ ] Add to candidate dashboard
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error handling

---

## ✅ Acceptance Criteria

### Backend

- [ ] `JobVectorizationService` generates 1536-dim embeddings using OpenAI
- [ ] `jobVectors` MongoDB collection exists with vector search index
- [ ] All active jobs have cached vectors in `jobVectors` collection
- [ ] New/updated jobs automatically trigger vectorization (async)
- [ ] Semantic similarity enabled with 35% weight in match scoring
- [ ] `candidateMatchingRepo.findProactiveMatches()` uses cached job vectors
- [ ] Vector search queries complete in <100ms (p95)

### Endpoints

- [ ] `candidate.getRecommendedJobs` returns top N matching jobs for logged-in candidate
- [ ] `recruiter.getSuggestedCandidates` uses cached job vectors (existing endpoint optimized)
- [ ] Both endpoints handle missing vectors gracefully

### Frontend

- [ ] Candidate dashboard shows "AI-Recommended Jobs" section
- [ ] Jobs display with match scores (e.g., "87% match")
- [ ] Empty state when candidate has no profile
- [ ] Loading states and error handling
- [ ] Mobile responsive

### Performance

- [ ] Job vectorization: <5 seconds per job
- [ ] Batch vectorization: 10 jobs/minute (rate limit safe)
- [ ] Vector search: <100ms per query
- [ ] OpenAI API cost: <$0.50 per 1000 jobs

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// src/services/ai/jobVectorization.test.ts
describe('JobVectorizationService', () => {
  it('should prepare job content correctly', () => {});
  it('should generate 1536-dimensional embeddings', () => {});
  it('should skip vectorization if already exists', () => {});
  it('should force refresh when requested', () => {});
});

// src/data-access/repositories/jobVectorRepo.test.ts
describe('JobVectorRepository', () => {
  it('should create job vector', () => {});
  it('should get by jobId', () => {});
  it('should handle duplicates', () => {});
});
```

### Integration Tests

```typescript
// Test full vectorization flow
it('should vectorize job and enable semantic matching', async () => {
  const job = await jobRepo.create({ title: 'Senior Engineer', ... });

  // Wait for async vectorization
  await waitFor(() => jobVectorRepo.getByJobId(job._id));

  const vector = await jobVectorRepo.getByJobId(job._id);
  expect(vector.embedding).toHaveLength(1536);

  // Test candidate matching uses this vector
  const suggestions = await candidateMatchingRepo.findProactiveMatches(job._id);
  expect(suggestions.length).toBeGreaterThan(0);
  expect(suggestions[0].matchScore).toBeGreaterThan(0);
});
```

### Manual Testing Checklist

- [ ] Create new job → verify vector generated within 5 seconds
- [ ] Update job description → verify vector refreshed
- [ ] Check `jobVectors` collection in MongoDB Compass
- [ ] Verify vector search index exists in Atlas
- [ ] Test recruiter suggestions with real job → see semantic matches
- [ ] Test candidate recommendations on dashboard
- [ ] Verify match scores include semantic component (>0%)
- [ ] Test with candidate who has no profile → see empty state
- [ ] Monitor OpenAI API usage in logs
- [ ] Test batch vectorization script on 50 jobs

---

## 📊 Success Metrics

### Technical Metrics

- [ ] 100% of active jobs have embeddings within 24 hours
- [ ] Semantic similarity weight active (35%) in match calculations
- [ ] Vector search latency <100ms (p95)
- [ ] Job vectorization success rate >99%

### Business Metrics

- [ ] Candidates see personalized job recommendations
- [ ] Recruiters see better candidate matches (higher avg scores)
- [ ] Reduced time-to-match by 30% (semantic vs keyword-only)

### Cost Metrics

- [ ] OpenAI API cost <$0.50 per 1000 jobs
- [ ] Monitor monthly embedding costs in production

---

## 🚀 Deployment Plan

### Phase 1: Infrastructure (Day 1)

1. Deploy `JobVectorizationService` and repo
2. Create MongoDB indexes
3. Run batch vectorization on existing jobs (off-peak hours)
4. Monitor costs and errors

### Phase 2: Enable Semantic Matching (Day 2)

1. Update `candidateMatchingRepo` to use cached vectors
2. Enable semantic similarity in match scoring (35% weight)
3. Deploy recruiter suggestions optimization
4. A/B test match quality

### Phase 3: Candidate Recommendations (Day 3)

1. Deploy `candidate.getRecommendedJobs` endpoint
2. Deploy `JobRecommendations` component
3. Add to candidate dashboard
4. Monitor engagement metrics

---

## 🔗 Dependencies

### Upstream (Required Before This Story)

- ✅ Resume vectorization service exists
- ✅ MongoDB Atlas Vector Search configured
- ✅ OpenAI API access

### Downstream (Depends on This Story)

- EP4-S11: AI-Powered Candidate Suggestions (needs cached job vectors)
- EP4-S3: Candidate Job Recommendations (new feature)

---

## 📝 Notes

### OpenAI Embedding Costs

- Model: `text-embedding-3-small`
- Cost: $0.02 per 1M tokens
- Average job: ~500 tokens
- 1000 jobs ≈ 500K tokens ≈ $0.01
- **Budget**: <$10/month for 100K jobs

### MongoDB Atlas Vector Search

- Free tier: 512MB vector data
- Paid tier: $0.10/GB/month
- 1000 vectors @ 1536 dims ≈ 6MB
- **Budget**: Free tier sufficient for MVP

### Performance Considerations

- Cache job vectors indefinitely (only refresh on update)
- Batch vectorization uses rate limiting (10/minute)
- Vector search indexed queries are fast (<100ms)

---

## 🎯 Dev Agent Notes

**Files to Create**:

1. `src/services/ai/jobVectorization.ts`
2. `src/data-access/repositories/jobVectorRepo.ts`
3. `scripts/migrations/create-vector-indexes.ts`
4. `scripts/vectorize-existing-jobs.ts`
5. `src/components/candidate/recommendations/JobRecommendations.tsx`

**Files to Modify**:

1. `src/shared/types/job.ts` - Add embedding fields
2. `src/data-access/repositories/jobRepo.ts` - Add auto-vectorization
3. `src/data-access/repositories/candidateMatchingRepo.ts` - Use cached vectors
4. `src/services/ai/jobCandidateMatching.ts` - Enable semantic similarity
5. `src/services/trpc/candidateRouter.ts` - Add recommendations endpoint
6. `src/app/candidate/dashboard/page.tsx` - Add recommendations UI

**Testing Priority**:

1. Unit tests for vectorization service
2. Integration test for end-to-end flow
3. Manual testing with real OpenAI API
4. Performance testing with 1000+ jobs

**Deployment Order**:

1. Backend services and repos
2. Batch vectorize existing jobs
3. Enable in candidate matching
4. Deploy candidate UI

---

**Story Status**: Ready for Development
**Assigned To**: James (Dev Agent)
**Start Date**: 2025-11-08
**Target Completion**: 2025-11-11 (3 days)

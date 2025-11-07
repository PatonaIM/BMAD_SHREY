import { getMongoClient } from '../mongoClient';
import { ObjectId } from 'mongodb';
import { logger } from '../../monitoring/logger';
import { calculateProactiveMatchScore } from '../../services/candidateMatching';

export interface CandidateSuggestion {
  _id: ObjectId;
  candidateId: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  currentTitle?: string;
  location?: string;
  skills: string[];
  yearsOfExperience?: number;
  matchScore: number;
  matchBreakdown: {
    vectorSimilarity: number;
    skillOverlap: number;
    experienceMatch: number;
    additionalFactors: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
}

export interface SuggestedCandidatesFilters {
  minMatchScore?: number;
  requiredSkills?: string[];
  minYearsExperience?: number;
  maxYearsExperience?: number;
  location?: string;
  isRemote?: boolean;
}

/**
 * Ensure indexes for candidate matching queries
 */
export async function ensureCandidateMatchingIndexes(): Promise<void> {
  try {
    const client = await getMongoClient();
    const db = client.db();
    const users = db.collection('users');
    const profileVersions = db.collection('profileVersions');

    // Index for filtering candidates by skills
    await users.createIndex(
      { 'profile.skills': 1 },
      { name: 'profile_skills' }
    );

    // Index for filtering by experience
    await users.createIndex(
      { 'profile.yearsOfExperience': 1 },
      { name: 'profile_experience' }
    );

    // Index for filtering by location
    await users.createIndex(
      { 'profile.location': 1 },
      { name: 'profile_location' }
    );

    // Index for profile versions by userId
    await profileVersions.createIndex(
      { userId: 1, isCurrent: 1 },
      { name: 'userId_isCurrent' }
    );

    logger.info({ msg: 'CandidateMatching indexes ensured' });
  } catch (err) {
    logger.error({
      msg: 'CandidateMatching index creation failed',
      error: (err as Error).message,
    });
  }
}

/**
 * Find proactive candidate matches using vector similarity search
 */
export async function findProactiveMatches(
  jobId: string,
  filters: SuggestedCandidatesFilters = {},
  limit: number = 20
): Promise<CandidateSuggestion[]> {
  const client = await getMongoClient();
  const db = client.db();
  const jobs = db.collection('jobs');
  const resumeVectors = db.collection('resumeVectors');

  // Get job details with required qualifications
  const job = await jobs.findOne({ _id: new ObjectId(jobId) });
  if (!job) {
    logger.warn({ msg: 'Job not found for proactive matching', jobId });
    return [];
  }

  // Get job's vector embedding (from job description or requirements)
  const jobVector = job.embedding;
  if (!jobVector || !Array.isArray(jobVector)) {
    logger.warn({ msg: 'Job has no vector embedding', jobId });
    return [];
  }

  // Build match conditions
  const matchConditions: Record<string, unknown> = {};
  if (filters.requiredSkills && filters.requiredSkills.length > 0) {
    matchConditions['extractedData.skills'] = { $all: filters.requiredSkills };
  }
  if (filters.minYearsExperience !== undefined) {
    matchConditions['extractedData.yearsOfExperience'] = {
      $gte: filters.minYearsExperience,
    };
  }
  if (
    filters.maxYearsExperience !== undefined &&
    matchConditions['extractedData.yearsOfExperience']
  ) {
    matchConditions['extractedData.yearsOfExperience'] = {
      ...matchConditions['extractedData.yearsOfExperience'],
      $lte: filters.maxYearsExperience,
    };
  } else if (filters.maxYearsExperience !== undefined) {
    matchConditions['extractedData.yearsOfExperience'] = {
      $lte: filters.maxYearsExperience,
    };
  }
  if (filters.location) {
    matchConditions['extractedData.location'] = filters.location;
  }

  // Vector similarity search pipeline
  const pipeline = [
    {
      $vectorSearch: {
        index: 'resume_vector_index',
        path: 'embedding',
        queryVector: jobVector,
        numCandidates: 100,
        limit: limit * 2, // Get more initially for filtering
      },
    },
    {
      $match: matchConditions,
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $lookup: {
        from: 'candidateInvitations',
        let: { candidateId: '$userId', currentJobId: new ObjectId(jobId) },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$candidateId', '$$candidateId'] },
                  { $eq: ['$jobId', '$$currentJobId'] },
                ],
              },
            },
          },
        ],
        as: 'invitation',
      },
    },
    {
      $match: {
        invitation: { $eq: [] }, // Exclude already invited candidates
      },
    },
    {
      $project: {
        _id: 1,
        candidateId: '$userId',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        email: '$user.email',
        currentTitle: '$extractedData.currentTitle',
        location: '$extractedData.location',
        skills: '$extractedData.skills',
        yearsOfExperience: '$extractedData.yearsOfExperience',
        embedding: 1,
        vectorScore: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $limit: limit,
    },
  ];

  const results = await resumeVectors.aggregate(pipeline).toArray();

  // Calculate comprehensive match scores
  const suggestions: CandidateSuggestion[] = [];
  for (const result of results) {
    const matchResult = calculateProactiveMatchScore(
      result.embedding || [],
      jobVector,
      result.skills || [],
      job.requirements?.skills || [],
      result.yearsOfExperience,
      job.requirements?.yearsOfExperience,
      result.location,
      job.location,
      job.requirements?.isRemote || false
    );

    // Apply minimum match score filter
    if (
      filters.minMatchScore !== undefined &&
      matchResult.total < filters.minMatchScore
    ) {
      continue;
    }

    suggestions.push({
      _id: result._id,
      candidateId: result.candidateId,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      currentTitle: result.currentTitle,
      location: result.location,
      skills: result.skills || [],
      yearsOfExperience: result.yearsOfExperience,
      matchScore: matchResult.total,
      matchBreakdown: {
        vectorSimilarity: matchResult.breakdown.semantic,
        skillOverlap: matchResult.breakdown.skills,
        experienceMatch: matchResult.breakdown.experience,
        additionalFactors: matchResult.breakdown.additional,
      },
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
    });
  }

  // Sort by match score descending
  suggestions.sort((a, b) => b.matchScore - a.matchScore);

  logger.info({
    msg: 'Proactive matches found',
    jobId,
    count: suggestions.length,
  });

  return suggestions;
}

/**
 * Find high-scoring candidates across all open jobs
 */
export async function findHighScoringCandidates(
  limit: number = 50
): Promise<CandidateSuggestion[]> {
  const client = await getMongoClient();
  const db = client.db();
  const resumeVectors = db.collection('resumeVectors');

  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $lookup: {
        from: 'applications',
        localField: 'userId',
        foreignField: 'userId',
        as: 'applications',
      },
    },
    {
      $addFields: {
        applicationCount: { $size: '$applications' },
        profileCompleteness: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$extractedData.skills', null] },
                {
                  $gt: [
                    { $size: { $ifNull: ['$extractedData.skills', []] } },
                    0,
                  ],
                },
                { $ne: ['$extractedData.yearsOfExperience', null] },
              ],
            },
            then: 100,
            else: {
              $cond: {
                if: { $ne: ['$extractedData.skills', null] },
                then: 50,
                else: 0,
              },
            },
          },
        },
      },
    },
    {
      $match: {
        profileCompleteness: { $gte: 50 }, // Only candidates with decent profiles
        'extractedData.skills': {
          $exists: true,
          $ne: null,
          $not: { $size: 0 },
        },
      },
    },
    {
      $project: {
        _id: 1,
        candidateId: '$userId',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        email: '$user.email',
        currentTitle: '$extractedData.currentTitle',
        location: '$extractedData.location',
        skills: '$extractedData.skills',
        yearsOfExperience: '$extractedData.yearsOfExperience',
        applicationCount: 1,
        profileCompleteness: 1,
        score: {
          $add: [
            { $multiply: ['$profileCompleteness', 0.4] },
            { $multiply: [{ $min: ['$applicationCount', 5] }, 10] }, // Cap at 5 applications
            {
              $multiply: [
                { $size: { $ifNull: ['$extractedData.skills', []] } },
                2,
              ],
            }, // 2 points per skill
          ],
        },
      },
    },
    {
      $sort: { score: -1 },
    },
    {
      $limit: limit,
    },
  ];

  const results = await resumeVectors.aggregate(pipeline).toArray();

  const suggestions: CandidateSuggestion[] = results.map(result => ({
    _id: result._id,
    candidateId: result.candidateId,
    firstName: result.firstName,
    lastName: result.lastName,
    email: result.email,
    currentTitle: result.currentTitle,
    location: result.location,
    skills: result.skills || [],
    yearsOfExperience: result.yearsOfExperience,
    matchScore: result.score || 0,
    matchBreakdown: {
      vectorSimilarity: 0,
      skillOverlap: 0,
      experienceMatch: 0,
      additionalFactors: result.score || 0,
    },
    matchedSkills: [],
    missingSkills: [],
  }));

  logger.info({
    msg: 'High-scoring candidates found',
    count: suggestions.length,
  });

  return suggestions;
}

export const candidateMatchingRepo = {
  findProactiveMatches,
  findHighScoringCandidates,
  ensureCandidateMatchingIndexes,
};

import { getMongoClient } from '../mongoClient';
import { ObjectId } from 'mongodb';
import { logger } from '../../monitoring/logger';
import { calculateProactiveMatchScore } from '../../services/candidateMatching';
import { jobVectorRepo } from './jobVectorRepo';
import { jobVectorizationService } from '../../services/ai/jobVectorization';

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
  applicationCount?: number;
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
  const resumeVectors = db.collection('resume_vectors');

  // Get job details with required qualifications
  const job = await jobs.findOne({ _id: new ObjectId(jobId) });
  if (!job) {
    logger.warn({ msg: 'Job not found for proactive matching', jobId });
    return [];
  }

  // Get job's CACHED vector embedding from jobVectors collection
  const jobVectorDoc = await jobVectorRepo.getByJobId(jobId);

  if (!jobVectorDoc || !jobVectorDoc.embedding) {
    logger.warn({
      msg: 'Job has no cached vector embedding - triggering async vectorization',
      jobId,
    });

    // Trigger async vectorization for future requests (don't wait)
    jobVectorizationService.vectorizeJob(jobId).catch(err => {
      logger.error({
        msg: 'Failed to trigger job vectorization',
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    // For now, return empty results (vector search requires embedding)
    // Alternative: fall back to keyword-only matching
    return [];
  }

  const jobVector = jobVectorDoc.embedding;

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
    const existing = matchConditions[
      'extractedData.yearsOfExperience'
    ] as Record<string, number>;
    matchConditions['extractedData.yearsOfExperience'] = {
      ...existing,
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
        path: 'embeddings',
        queryVector: jobVector,
        numCandidates: 100,
        limit: limit * 2, // Get more initially for filtering
      },
    },
    {
      $lookup: {
        from: 'extracted_profiles',
        localField: 'userId',
        foreignField: 'userId',
        as: 'extractedProfile',
      },
    },
    {
      $unwind: {
        path: '$extractedProfile',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        extractedData: {
          $mergeObjects: [
            '$extractedProfile',
            {
              // Calculate current title from most recent current experience
              currentTitle: {
                $let: {
                  vars: {
                    currentExp: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: {
                              $ifNull: ['$extractedProfile.experience', []],
                            },
                            as: 'exp',
                            cond: { $eq: ['$$exp.isCurrent', true] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: '$$currentExp.position',
                },
              },
              // Calculate total years of experience
              yearsOfExperience: {
                $size: { $ifNull: ['$extractedProfile.experience', []] },
              },
              // Get location from current or most recent experience
              location: {
                $let: {
                  vars: {
                    currentExp: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: {
                              $ifNull: ['$extractedProfile.experience', []],
                            },
                            as: 'exp',
                            cond: { $eq: ['$$exp.isCurrent', true] },
                          },
                        },
                        0,
                      ],
                    },
                    recentExp: {
                      $arrayElemAt: [
                        { $ifNull: ['$extractedProfile.experience', []] },
                        0,
                      ],
                    },
                  },
                  in: {
                    $ifNull: ['$$currentExp.location', '$$recentExp.location'],
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      $match: matchConditions,
    },
    {
      $addFields: {
        vectorScore: { $meta: 'vectorSearchScore' }, // Capture vector score before grouping
      },
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
      $lookup: {
        from: 'applications',
        let: { candidateId: '$userId', currentJobId: new ObjectId(jobId) },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$candidateId', '$$candidateId'],
              },
            },
          },
          {
            $facet: {
              currentJobApplication: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$jobId', '$$currentJobId'],
                    },
                  },
                },
              ],
              allApplications: [{ $count: 'count' }],
            },
          },
        ],
        as: 'applicationData',
      },
    },
    {
      $unwind: {
        path: '$applicationData',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        hasAppliedToThisJob: {
          $gt: [
            {
              $size: {
                $ifNull: ['$applicationData.currentJobApplication', []],
              },
            },
            0,
          ],
        },
        applicationCount: {
          $ifNull: [
            {
              $arrayElemAt: ['$applicationData.allApplications.count', 0],
            },
            0,
          ],
        },
      },
    },
    {
      $match: {
        hasAppliedToThisJob: false, // Exclude candidates who already applied to this job
      },
    },
    {
      $group: {
        _id: '$userId', // Group by userId to remove duplicates
        doc: { $first: '$$ROOT' },
        maxVectorScore: { $max: '$vectorScore' }, // Use captured vectorScore field
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            '$doc',
            {
              vectorScore: '$maxVectorScore',
            },
          ],
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
        skills: {
          $cond: {
            if: { $isArray: '$extractedData.skills' },
            then: {
              $map: {
                input: '$extractedData.skills',
                as: 'skill',
                in: {
                  $cond: {
                    if: { $eq: [{ $type: '$$skill' }, 'object'] },
                    then: '$$skill.name',
                    else: '$$skill',
                  },
                },
              },
            },
            else: [],
          },
        },
        yearsOfExperience: '$extractedData.yearsOfExperience',
        applicationCount: 1,
        embedding: 1,
        vectorScore: 1,
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
    // Use vectorScore from MongoDB's $vectorSearch (0-1 similarity)
    const semanticSimilarity = result.vectorScore || 0;

    const matchResult = calculateProactiveMatchScore(
      semanticSimilarity, // MongoDB vector search score (already computed)
      result.skills || [],
      job.requirements?.skills || [],
      result.yearsOfExperience,
      job.requirements?.yearsOfExperience,
      result.location,
      job.location,
      undefined, // candidateIsRemote - not in extractedData yet
      job.requirements?.isRemote || false
    );

    // Calculate match score but don't filter - just collect all candidates
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
      applicationCount: result.applicationCount || 0,
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

  // Sort by match score descending (highest match first)
  suggestions.sort((a, b) => b.matchScore - a.matchScore);

  // Apply minMatchScore filter AFTER sorting if specified
  const filteredSuggestions =
    filters.minMatchScore !== undefined
      ? suggestions.filter(s => s.matchScore >= filters.minMatchScore!)
      : suggestions;

  logger.info({
    msg: 'Proactive matches found',
    jobId,
    count: filteredSuggestions.length,
  });

  return filteredSuggestions;
}

/**
 * Find high-scoring candidates across all open jobs
 */
export async function findHighScoringCandidates(
  limit: number = 50
): Promise<CandidateSuggestion[]> {
  const client = await getMongoClient();
  const db = client.db();
  const resumeVectors = db.collection('resume_vectors');

  const pipeline = [
    {
      $lookup: {
        from: 'extracted_profiles',
        localField: 'userId',
        foreignField: 'userId',
        as: 'extractedProfile',
      },
    },
    {
      $unwind: {
        path: '$extractedProfile',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        extractedData: {
          $mergeObjects: [
            '$extractedProfile',
            {
              // Calculate current title from most recent current experience
              currentTitle: {
                $let: {
                  vars: {
                    currentExp: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: {
                              $ifNull: ['$extractedProfile.experience', []],
                            },
                            as: 'exp',
                            cond: { $eq: ['$$exp.isCurrent', true] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: '$$currentExp.position',
                },
              },
              // Calculate total years of experience (simplified - count of jobs)
              yearsOfExperience: {
                $size: { $ifNull: ['$extractedProfile.experience', []] },
              },
              // Get location from current or most recent experience
              location: {
                $let: {
                  vars: {
                    currentExp: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: {
                              $ifNull: ['$extractedProfile.experience', []],
                            },
                            as: 'exp',
                            cond: { $eq: ['$$exp.isCurrent', true] },
                          },
                        },
                        0,
                      ],
                    },
                    recentExp: {
                      $arrayElemAt: [
                        { $ifNull: ['$extractedProfile.experience', []] },
                        0,
                      ],
                    },
                  },
                  in: {
                    $ifNull: ['$$currentExp.location', '$$recentExp.location'],
                  },
                },
              },
            },
          ],
        },
      },
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
        from: 'applications',
        localField: 'userId',
        foreignField: 'candidateId',
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
        skills: {
          $cond: {
            if: { $isArray: '$extractedData.skills' },
            then: {
              $map: {
                input: '$extractedData.skills',
                as: 'skill',
                in: {
                  $cond: {
                    if: { $eq: [{ $type: '$$skill' }, 'object'] },
                    then: '$$skill.name',
                    else: '$$skill',
                  },
                },
              },
            },
            else: [],
          },
        },
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

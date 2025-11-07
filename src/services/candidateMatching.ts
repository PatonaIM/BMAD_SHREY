import { logger } from '../monitoring/logger';

/**
 * Candidate matching algorithms for proactive candidate sourcing
 */

export interface SkillMatch {
  matched: string[];
  missing: string[];
  overlapPercentage: number;
}

export interface ExperienceMatch {
  candidateYears: number;
  requiredYears: number;
  score: number;
}

export interface ProactiveMatchScore {
  total: number;
  breakdown: {
    semantic: number;
    skills: number;
    experience: number;
    additional: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns value between 0 and 1 (1 = perfect match)
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    logger.warn({
      msg: 'Invalid vectors for cosine similarity',
      lengthA: vectorA?.length,
      lengthB: vectorB?.length,
    });
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const valA = vectorA[i];
    const valB = vectorB[i];
    if (valA === undefined || valB === undefined) continue;

    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Calculate skill overlap between candidate skills and required skills
 */
export function calculateSkillOverlap(
  candidateSkills: string[],
  requiredSkills: string[]
): SkillMatch {
  if (!candidateSkills || !requiredSkills) {
    return {
      matched: [],
      missing: requiredSkills || [],
      overlapPercentage: 0,
    };
  }

  // Normalize skills to lowercase for comparison
  const candidateSkillsNormalized = candidateSkills.map(s =>
    s.toLowerCase().trim()
  );
  const requiredSkillsNormalized = requiredSkills.map(s =>
    s.toLowerCase().trim()
  );

  const matched = requiredSkillsNormalized.filter(skill =>
    candidateSkillsNormalized.includes(skill)
  );

  const missing = requiredSkillsNormalized.filter(
    skill => !candidateSkillsNormalized.includes(skill)
  );

  const overlapPercentage =
    requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0;

  return {
    matched: matched.map(
      s => requiredSkills.find(rs => rs.toLowerCase() === s) || s
    ),
    missing: missing.map(
      s => requiredSkills.find(rs => rs.toLowerCase() === s) || s
    ),
    overlapPercentage,
  };
}

/**
 * Calculate experience match score based on candidate years vs required years
 */
export function calculateExperienceMatch(
  candidateYears: number,
  requiredYears: number
): ExperienceMatch {
  if (candidateYears < 0 || requiredYears < 0) {
    return {
      candidateYears,
      requiredYears,
      score: 0,
    };
  }

  // Perfect match if candidate has exactly the required years
  if (candidateYears === requiredYears) {
    return { candidateYears, requiredYears, score: 1.0 };
  }

  // Good match if candidate is within +/- 2 years of requirement
  const difference = Math.abs(candidateYears - requiredYears);
  if (difference <= 2) {
    return { candidateYears, requiredYears, score: 0.9 };
  }

  // Acceptable if candidate has more experience (overqualified but acceptable)
  if (candidateYears > requiredYears) {
    const overqualification = candidateYears - requiredYears;
    // Penalize slightly for being too overqualified (might not accept offer)
    if (overqualification > 5) {
      return { candidateYears, requiredYears, score: 0.6 };
    }
    return { candidateYears, requiredYears, score: 0.8 };
  }

  // Underqualified - score decreases as gap increases
  const underqualification = requiredYears - candidateYears;
  if (underqualification <= 3) {
    return { candidateYears, requiredYears, score: 0.7 };
  }
  if (underqualification <= 5) {
    return { candidateYears, requiredYears, score: 0.5 };
  }

  return { candidateYears, requiredYears, score: 0.3 };
}

/**
 * Calculate additional matching factors (location, industry, etc.)
 */
export function calculateAdditionalFactors(
  candidateLocation?: string,
  jobLocation?: string,
  candidateIsRemote?: boolean,
  jobIsRemote?: boolean
): number {
  let score = 0.5; // Base score

  // Remote work match
  if (jobIsRemote && candidateIsRemote) {
    score += 0.3;
  } else if (!jobIsRemote && !candidateIsRemote) {
    // Both prefer on-site
    score += 0.2;
  }

  // Location match (if both are on-site or hybrid)
  if (candidateLocation && jobLocation && !jobIsRemote && !candidateIsRemote) {
    const candidateParts = candidateLocation.toLowerCase().split(',');
    const jobParts = jobLocation.toLowerCase().split(',');

    const candidateCity = candidateParts[0]?.trim();
    const jobCity = jobParts[0]?.trim();

    if (candidateCity && jobCity && candidateCity === jobCity) {
      score += 0.2;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Calculate comprehensive proactive match score for a candidate
 */
export function calculateProactiveMatchScore(
  semanticSimilarity: number,
  candidateSkills: string[],
  requiredSkills: string[],
  candidateExperience: number,
  requiredExperience: number,
  candidateLocation?: string,
  jobLocation?: string,
  candidateIsRemote?: boolean,
  jobIsRemote?: boolean
): ProactiveMatchScore {
  // Weight factors
  const SEMANTIC_WEIGHT = 0.4; // 40%
  const SKILLS_WEIGHT = 0.35; // 35%
  const EXPERIENCE_WEIGHT = 0.15; // 15%
  const ADDITIONAL_WEIGHT = 0.1; // 10%

  // Calculate individual scores
  const semanticScore = semanticSimilarity * SEMANTIC_WEIGHT;

  const skillMatch = calculateSkillOverlap(candidateSkills, requiredSkills);
  const skillScore = skillMatch.overlapPercentage * SKILLS_WEIGHT;

  const experienceMatch = calculateExperienceMatch(
    candidateExperience,
    requiredExperience
  );
  const experienceScore = experienceMatch.score * EXPERIENCE_WEIGHT;

  const additionalScore =
    calculateAdditionalFactors(
      candidateLocation,
      jobLocation,
      candidateIsRemote,
      jobIsRemote
    ) * ADDITIONAL_WEIGHT;

  const totalScore =
    (semanticScore + skillScore + experienceScore + additionalScore) * 100;

  return {
    total: Math.round(totalScore * 10) / 10, // Round to 1 decimal place
    breakdown: {
      semantic: Math.round(semanticScore * 100 * 10) / 10,
      skills: Math.round(skillScore * 100 * 10) / 10,
      experience: Math.round(experienceScore * 100 * 10) / 10,
      additional: Math.round(additionalScore * 100 * 10) / 10,
    },
    matchedSkills: skillMatch.matched,
    missingSkills: skillMatch.missing,
  };
}

/**
 * Check if a candidate meets minimum thresholds for proactive matching
 */
export function meetsProactiveMatchThresholds(
  matchScore: ProactiveMatchScore,
  hasCompleteProfile: boolean,
  hasAIInterview: boolean,
  minScore: number = 70
): boolean {
  if (!hasCompleteProfile) return false;
  if (matchScore.total < minScore) return false;

  // Lower threshold if candidate has completed AI interview
  if (hasAIInterview && matchScore.total >= minScore - 5) {
    return true;
  }

  return true;
}

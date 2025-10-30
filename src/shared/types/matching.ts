export interface MatchScore {
  overall: number; // 0-100 overall match score
  semantic: number; // 0-100 semantic similarity score
  skills: number; // 0-100 skills alignment score
  experience: number; // 0-100 experience match score
  other: number; // 0-100 other factors score
  confidence: number; // 0-1 confidence in the match
}

export interface MatchFactors {
  // Semantic matching (40% weight)
  semanticSimilarity: number; // Cosine similarity from vectors

  // Skills matching (35% weight)
  skillsAlignment: {
    matchedSkills: string[];
    missingSkills: string[];
    skillsMatchRatio: number; // 0-1
    proficiencyScore: number; // 0-1 based on skill levels
  };

  // Experience matching (15% weight)
  experienceMatch: {
    levelAlignment: number; // 0-1 how well experience levels match
    domainRelevance: number; // 0-1 industry/domain relevance
    recencyBoost: number; // 0-1 boost for recent experience
  };

  // Other factors (10% weight)
  otherFactors: {
    locationMatch: number; // 0-1 location preference match
    employmentTypeMatch: number; // 0-1 employment type preference
    salaryAlignment: number; // 0-1 salary expectation alignment
    companyFit: number; // 0-1 company culture/size fit
  };
}

export interface JobCandidateMatch {
  jobId: string;
  userId: string;
  score: MatchScore;
  factors: MatchFactors;
  calculatedAt: Date;
  reasoning: string[]; // Human-readable explanations for the match
}

export interface MatchingOptions {
  includeInactive?: boolean; // Include inactive job postings
  maxResults?: number; // Maximum number of matches to return
  minScore?: number; // Minimum overall score threshold (0-100)
  weights?: MatchWeights; // Custom weights for scoring factors
  excludeApplied?: boolean; // Exclude jobs already applied to
}

export interface MatchWeights {
  semantic: number; // Default: 0.4 (40%)
  skills: number; // Default: 0.35 (35%)
  experience: number; // Default: 0.15 (15%)
  other: number; // Default: 0.10 (10%)
}

export interface CandidateProfile {
  userId: string;
  summary?: string;
  skills: Array<{
    name: string;
    category: string;
    proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    yearsOfExperience?: number;
  }>;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
    skills?: string[];
    location?: string;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
  }>;
  preferences?: {
    locations?: string[];
    employmentTypes?: string[];
    salaryRange?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    remoteWork?: boolean;
  };
  vector?: number[]; // Semantic embeddings from vectorization service
}

export interface BatchMatchRequest {
  jobIds: string[];
  userIds: string[];
  options?: MatchingOptions;
}

export interface MatchingStats {
  totalCalculations: number;
  averageProcessingTime: number; // milliseconds
  cacheHitRate: number; // 0-1
  lastCalculatedAt: Date;
  topMatchScore: number;
  averageMatchScore: number;
}

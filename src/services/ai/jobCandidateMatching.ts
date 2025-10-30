/**
 * Job-Candidate Matching Algorithm
 *
 * Implements sophisticated matching with weighted scoring:
 * - 40% Semantic similarity (vector embeddings)
 * - 35% Skills alignment (exact + fuzzy matching)
 * - 15% Experience match (level + domain + recency)
 * - 10% Other factors (location, employment type, salary, company fit)
 *
 * Target: <500ms for single match calculation
 */

import { logger } from '../../monitoring/logger';
import { ok, err, type Result } from '../../shared/result';
import type {
  MatchScore,
  MatchFactors,
  JobCandidateMatch,
  MatchingOptions,
  MatchWeights,
  CandidateProfile,
  MatchingStats,
} from '../../shared/types/matching';
import type { Job } from '../../shared/types/job';
import { skillNormalizationService } from './skillNormalization';

export class JobCandidateMatchingService {
  private readonly defaultWeights: MatchWeights = {
    semantic: 0.4,
    skills: 0.35,
    experience: 0.15,
    other: 0.1,
  };

  private readonly performanceTarget = 500; // ms
  private stats: MatchingStats = {
    totalCalculations: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
    lastCalculatedAt: new Date(),
    topMatchScore: 0,
    averageMatchScore: 0,
  };

  /**
   * Calculate match score between a job and candidate
   */
  async calculateMatch(
    job: Job,
    candidate: CandidateProfile,
    options: MatchingOptions = {}
  ): Promise<Result<JobCandidateMatch, string>> {
    const startTime = performance.now();

    try {
      logger.info({
        msg: 'Calculating job-candidate match',
        jobId: job._id,
        userId: candidate.userId,
      });

      // Use custom weights or defaults
      const weights = options.weights || this.defaultWeights;

      // Calculate all matching factors
      const factors = await this.calculateMatchingFactors(job, candidate);

      // Calculate weighted scores
      const semanticScore = factors.semanticSimilarity * 100;
      const skillsScore = this.calculateSkillsScore(factors.skillsAlignment);
      const experienceScore = this.calculateExperienceScore(
        factors.experienceMatch
      );
      const otherScore = this.calculateOtherScore(factors.otherFactors);

      // Calculate overall weighted score
      const overallScore =
        semanticScore * weights.semantic +
        skillsScore * weights.skills +
        experienceScore * weights.experience +
        otherScore * weights.other;

      const matchScore: MatchScore = {
        overall: Math.round(overallScore),
        semantic: Math.round(semanticScore),
        skills: Math.round(skillsScore),
        experience: Math.round(experienceScore),
        other: Math.round(otherScore),
        confidence: this.calculateConfidence(factors),
      };

      // Generate human-readable reasoning
      const reasoning = this.generateMatchReasoning(factors, matchScore);

      const match: JobCandidateMatch = {
        jobId: job._id,
        userId: candidate.userId,
        score: matchScore,
        factors,
        calculatedAt: new Date(),
        reasoning,
      };

      // Update performance stats
      const processingTime = performance.now() - startTime;
      this.updateStats(processingTime, overallScore);

      // Check if we met performance target
      if (processingTime > this.performanceTarget) {
        logger.warn({
          msg: 'Match calculation exceeded performance target',
          jobId: job._id,
          userId: candidate.userId,
          processingTime,
          target: this.performanceTarget,
        });
      }

      logger.info({
        msg: 'Match calculation completed',
        jobId: job._id,
        userId: candidate.userId,
        overallScore: matchScore.overall,
        processingTime: Math.round(processingTime),
      });

      return ok(match);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Match calculation failed',
        jobId: job._id,
        userId: candidate.userId,
        error: message,
      });
      return err('calculation_error', `Match calculation failed: ${message}`);
    }
  }

  /**
   * Calculate all matching factors
   */
  private async calculateMatchingFactors(
    job: Job,
    candidate: CandidateProfile
  ): Promise<MatchFactors> {
    // Semantic similarity (vector matching)
    const semanticSimilarity = await this.calculateSemanticSimilarity(
      job,
      candidate
    );

    // Skills alignment
    const skillsAlignment = this.calculateSkillsAlignment(job, candidate);

    // Experience matching
    const experienceMatch = this.calculateExperienceMatch(job, candidate);

    // Other factors
    const otherFactors = this.calculateOtherFactors(job, candidate);

    return {
      semanticSimilarity,
      skillsAlignment,
      experienceMatch,
      otherFactors,
    };
  }

  /**
   * Calculate semantic similarity using vector embeddings
   */
  private async calculateSemanticSimilarity(
    job: Job,
    candidate: CandidateProfile
  ): Promise<number> {
    try {
      // If candidate has no vector, return 0
      if (!candidate.vector || candidate.vector.length === 0) {
        return 0;
      }

      // For now, we'll need to generate job embeddings on the fly
      // In a production system, jobs would have pre-computed embeddings
      const jobText = this.prepareJobTextForEmbedding(job);
      const jobEmbeddingResult = await this.generateJobEmbedding(jobText);

      if (!jobEmbeddingResult.ok) {
        logger.warn({
          msg: 'Failed to generate job embedding for matching',
          jobId: job._id,
        });
        return 0;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(
        candidate.vector,
        jobEmbeddingResult.value
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

  /**
   * Calculate skills alignment between job and candidate
   */
  private calculateSkillsAlignment(job: Job, candidate: CandidateProfile) {
    const jobSkills = job.skills.map(skill =>
      skillNormalizationService.normalizeSkill(skill)
    );
    const candidateSkills = candidate.skills.map(skill =>
      skillNormalizationService.normalizeSkill(skill.name)
    );

    const jobSkillsNormalized = jobSkills.map(s => s.normalized.toLowerCase());
    const candidateSkillsNormalized = candidateSkills.map(s =>
      s.normalized.toLowerCase()
    );

    // Find matched and missing skills
    const matchedSkills = jobSkillsNormalized.filter(jobSkill =>
      candidateSkillsNormalized.includes(jobSkill)
    );
    const missingSkills = jobSkillsNormalized.filter(
      jobSkill => !candidateSkillsNormalized.includes(jobSkill)
    );

    // Calculate skills match ratio
    const skillsMatchRatio =
      jobSkillsNormalized.length > 0
        ? matchedSkills.length / jobSkillsNormalized.length
        : 1;

    // Calculate proficiency score based on candidate's skill levels
    const proficiencyScore = this.calculateProficiencyScore(
      candidate.skills,
      matchedSkills
    );

    return {
      matchedSkills,
      missingSkills,
      skillsMatchRatio,
      proficiencyScore,
    };
  }

  /**
   * Calculate experience match factors
   */
  private calculateExperienceMatch(job: Job, candidate: CandidateProfile) {
    // Experience level alignment
    const levelAlignment = this.calculateLevelAlignment(
      job.experienceLevel,
      candidate
    );

    // Domain relevance (industry/company type similarity)
    const domainRelevance = this.calculateDomainRelevance(job, candidate);

    // Recency boost (more recent experience weighted higher)
    const recencyBoost = this.calculateRecencyBoost(candidate);

    return {
      levelAlignment,
      domainRelevance,
      recencyBoost,
    };
  }

  /**
   * Calculate other matching factors
   */
  private calculateOtherFactors(job: Job, candidate: CandidateProfile) {
    // Location matching
    const locationMatch = this.calculateLocationMatch(job, candidate);

    // Employment type matching
    const employmentTypeMatch = this.calculateEmploymentTypeMatch(
      job,
      candidate
    );

    // Salary alignment
    const salaryAlignment = this.calculateSalaryAlignment(job, candidate);

    // Company fit (placeholder for now)
    const companyFit = 0.5; // Default neutral score

    return {
      locationMatch,
      employmentTypeMatch,
      salaryAlignment,
      companyFit,
    };
  }

  /**
   * Generate job embedding for semantic matching
   */
  private async generateJobEmbedding(
    _jobText: string
  ): Promise<Result<number[], string>> {
    try {
      // This would typically use the same embedding service as resumes
      // For now, we'll create a simple implementation
      // In production, jobs should have pre-computed embeddings

      // Placeholder: return a dummy embedding for development
      // This should be replaced with actual OpenAI embedding generation
      const dummyEmbedding = new Array(1536)
        .fill(0)
        .map(() => Math.random() - 0.5);
      return ok(dummyEmbedding);
    } catch (error) {
      return err(
        'embedding_error',
        `Failed to generate job embedding: ${error}`
      );
    }
  }

  /**
   * Prepare job text for embedding generation
   */
  private prepareJobTextForEmbedding(job: Job): string {
    const sections: string[] = [];

    sections.push(`Title: ${job.title}`);
    sections.push(`Company: ${job.company}`);

    if (job.description) {
      sections.push(`Description: ${job.description}`);
    }

    if (job.requirements) {
      sections.push(`Requirements: ${job.requirements}`);
    }

    if (job.skills.length > 0) {
      sections.push(`Skills: ${job.skills.join(', ')}`);
    }

    if (job.location) {
      sections.push(`Location: ${job.location}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const a = vectorA[i] || 0;
      const b = vectorB[i] || 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate proficiency score for matched skills
   */
  private calculateProficiencyScore(
    candidateSkills: CandidateProfile['skills'],
    matchedSkills: string[]
  ): number {
    if (matchedSkills.length === 0) return 0;

    const proficiencyWeights = {
      expert: 1.0,
      advanced: 0.8,
      intermediate: 0.6,
      beginner: 0.4,
    };

    let totalScore = 0;
    let skillsWithProficiency = 0;

    matchedSkills.forEach(skillName => {
      const skill = candidateSkills.find(s =>
        skillNormalizationService
          .normalizeSkill(s.name)
          .normalized.toLowerCase()
          .includes(skillName.toLowerCase())
      );

      if (skill && skill.proficiency) {
        totalScore += proficiencyWeights[skill.proficiency];
        skillsWithProficiency++;
      } else {
        // Default to intermediate if no proficiency specified
        totalScore += proficiencyWeights.intermediate;
        skillsWithProficiency++;
      }
    });

    return skillsWithProficiency > 0 ? totalScore / skillsWithProficiency : 0.5;
  }

  /**
   * Calculate experience level alignment
   */
  private calculateLevelAlignment(
    jobLevel: Job['experienceLevel'],
    candidate: CandidateProfile
  ): number {
    if (!jobLevel) return 0.5; // Neutral if job level not specified

    // Calculate candidate's experience level based on work history
    const candidateLevel = this.inferCandidateExperienceLevel(candidate);

    const levelMap = {
      entry: 1,
      mid: 2,
      senior: 3,
      lead: 4,
      executive: 5,
    };

    const jobLevelNum = levelMap[jobLevel] || 2;
    const candidateLevelNum = levelMap[candidateLevel || 'mid'] || 2;

    // Perfect match = 1.0, adjacent levels = 0.7, further = decreases
    const difference = Math.abs(jobLevelNum - candidateLevelNum);

    if (difference === 0) return 1.0;
    if (difference === 1) return 0.7;
    if (difference === 2) return 0.4;
    return 0.2;
  }

  /**
   * Infer candidate's experience level from work history
   */
  private inferCandidateExperienceLevel(
    candidate: CandidateProfile
  ): Job['experienceLevel'] {
    const totalYears = candidate.experience.reduce((total, exp) => {
      const startYear = new Date(exp.startDate).getFullYear();
      const endYear = exp.endDate
        ? new Date(exp.endDate).getFullYear()
        : new Date().getFullYear();
      return total + (endYear - startYear);
    }, 0);

    if (totalYears < 2) return 'entry';
    if (totalYears < 5) return 'mid';
    if (totalYears < 8) return 'senior';
    if (totalYears < 12) return 'lead';
    return 'executive';
  }

  /**
   * Calculate domain relevance
   */
  private calculateDomainRelevance(
    job: Job,
    candidate: CandidateProfile
  ): number {
    // Simple implementation: check if candidate worked at similar companies
    // or in similar industries (based on job titles/descriptions)
    const jobCompany = job.company.toLowerCase();
    const candidateCompanies = candidate.experience.map(exp =>
      exp.company.toLowerCase()
    );

    // Exact company match gets high score
    if (candidateCompanies.includes(jobCompany)) {
      return 1.0;
    }

    // Check for similar industry keywords in job titles/descriptions
    const jobKeywords = this.extractIndustryKeywords(
      job.title + ' ' + job.description
    );
    const candidateKeywords = candidate.experience.flatMap(exp =>
      this.extractIndustryKeywords(exp.position + ' ' + (exp.description || ''))
    );

    const commonKeywords = jobKeywords.filter(keyword =>
      candidateKeywords.includes(keyword)
    );

    const relevanceScore = Math.min(
      1.0,
      commonKeywords.length / Math.max(1, jobKeywords.length)
    );

    return relevanceScore;
  }

  /**
   * Extract industry keywords for domain matching
   */
  private extractIndustryKeywords(text: string): string[] {
    const keywords = [
      'fintech',
      'healthcare',
      'edtech',
      'e-commerce',
      'saas',
      'blockchain',
      'ai',
      'machine learning',
      'data science',
      'cybersecurity',
      'cloud',
      'mobile',
      'web',
      'backend',
      'frontend',
      'fullstack',
      'devops',
      'startup',
      'enterprise',
      'consulting',
      'agency',
      'product',
    ];

    const textLower = text.toLowerCase();
    return keywords.filter(keyword => textLower.includes(keyword));
  }

  /**
   * Calculate recency boost for recent experience
   */
  private calculateRecencyBoost(candidate: CandidateProfile): number {
    if (candidate.experience.length === 0) return 0;

    // Find most recent experience
    const mostRecentExp = candidate.experience.reduce((latest, exp) => {
      const expDate = exp.endDate ? new Date(exp.endDate) : new Date();
      const latestDate = latest.endDate ? new Date(latest.endDate) : new Date();
      return expDate > latestDate ? exp : latest;
    });

    const endDate = mostRecentExp.endDate
      ? new Date(mostRecentExp.endDate)
      : new Date();
    const monthsSinceEnd =
      (Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Recent experience (< 6 months) gets full boost
    if (monthsSinceEnd < 6) return 1.0;
    // Experience within 2 years gets partial boost
    if (monthsSinceEnd < 24) return 0.8 - (monthsSinceEnd / 24) * 0.3;
    // Older experience gets minimal boost
    return 0.5;
  }

  /**
   * Calculate location match
   */
  private calculateLocationMatch(
    job: Job,
    candidate: CandidateProfile
  ): number {
    if (!job.location) return 1.0; // If job has no location requirement, perfect match

    const jobLocation = job.location.toLowerCase();

    // Check candidate's location preferences
    if (candidate.preferences?.locations) {
      const hasMatchingLocation = candidate.preferences.locations.some(
        loc =>
          loc.toLowerCase().includes(jobLocation) ||
          jobLocation.includes(loc.toLowerCase())
      );
      if (hasMatchingLocation) return 1.0;
    }

    // Check if candidate is open to remote work
    if (candidate.preferences?.remoteWork && jobLocation.includes('remote')) {
      return 1.0;
    }

    // Default to partial match if no preference specified
    return 0.5;
  }

  /**
   * Calculate employment type match
   */
  private calculateEmploymentTypeMatch(
    job: Job,
    candidate: CandidateProfile
  ): number {
    if (!job.employmentType) return 1.0;

    if (candidate.preferences?.employmentTypes) {
      return candidate.preferences.employmentTypes.includes(job.employmentType)
        ? 1.0
        : 0.3;
    }

    return 0.7; // Default partial match if no preference
  }

  /**
   * Calculate salary alignment
   */
  private calculateSalaryAlignment(
    job: Job,
    candidate: CandidateProfile
  ): number {
    if (!job.salary || !candidate.preferences?.salaryRange) {
      return 0.5; // Neutral if no salary info
    }

    const jobMin = job.salary.min || 0;
    const jobMax = job.salary.max || Number.MAX_SAFE_INTEGER;
    const candidateMin = candidate.preferences.salaryRange.min || 0;
    const candidateMax =
      candidate.preferences.salaryRange.max || Number.MAX_SAFE_INTEGER;

    // Check for overlap in salary ranges
    const overlapMin = Math.max(jobMin, candidateMin);
    const overlapMax = Math.min(jobMax, candidateMax);

    if (overlapMin <= overlapMax) {
      // Calculate percentage of overlap
      const jobRange = jobMax - jobMin;
      const candidateRange = candidateMax - candidateMin;
      const overlapRange = overlapMax - overlapMin;

      if (jobRange === 0 || candidateRange === 0) return 1.0;

      const overlapRatio = overlapRange / Math.min(jobRange, candidateRange);
      return Math.min(1.0, overlapRatio);
    }

    return 0.1; // Minimal score if no overlap
  }

  /**
   * Calculate overall confidence in the match
   */
  private calculateConfidence(factors: MatchFactors): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data quality
    if (factors.semanticSimilarity > 0) confidence += 0.2;
    if (factors.skillsAlignment.matchedSkills.length > 0) confidence += 0.2;
    if (factors.experienceMatch.levelAlignment > 0.5) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate individual component scores
   */
  private calculateSkillsScore(
    skillsAlignment: MatchFactors['skillsAlignment']
  ): number {
    // Combine match ratio and proficiency
    return (
      skillsAlignment.skillsMatchRatio * 70 +
      skillsAlignment.proficiencyScore * 30
    );
  }

  private calculateExperienceScore(
    experienceMatch: MatchFactors['experienceMatch']
  ): number {
    return (
      experienceMatch.levelAlignment * 50 +
      experienceMatch.domainRelevance * 30 +
      experienceMatch.recencyBoost * 20
    );
  }

  private calculateOtherScore(
    otherFactors: MatchFactors['otherFactors']
  ): number {
    return (
      otherFactors.locationMatch * 30 +
      otherFactors.employmentTypeMatch * 25 +
      otherFactors.salaryAlignment * 25 +
      otherFactors.companyFit * 20
    );
  }

  /**
   * Generate human-readable explanations for the match
   */
  private generateMatchReasoning(
    factors: MatchFactors,
    score: MatchScore
  ): string[] {
    const reasoning: string[] = [];

    // Overall match assessment
    if (score.overall >= 80) {
      reasoning.push('🎯 Excellent match - highly recommended!');
    } else if (score.overall >= 60) {
      reasoning.push('✅ Good match - worth considering');
    } else if (score.overall >= 40) {
      reasoning.push('🤔 Moderate match - some alignment');
    } else {
      reasoning.push('❌ Poor match - significant gaps');
    }

    // Skills analysis
    if (factors.skillsAlignment.matchedSkills.length > 0) {
      reasoning.push(
        `💼 Matches ${factors.skillsAlignment.matchedSkills.length} required skills: ${factors.skillsAlignment.matchedSkills.slice(0, 3).join(', ')}${factors.skillsAlignment.matchedSkills.length > 3 ? '...' : ''}`
      );
    }

    if (factors.skillsAlignment.missingSkills.length > 0) {
      reasoning.push(
        `📚 Missing skills: ${factors.skillsAlignment.missingSkills.slice(0, 3).join(', ')}${factors.skillsAlignment.missingSkills.length > 3 ? '...' : ''}`
      );
    }

    // Experience analysis
    if (factors.experienceMatch.levelAlignment > 0.7) {
      reasoning.push('🏆 Experience level is well-aligned');
    } else if (factors.experienceMatch.levelAlignment < 0.3) {
      reasoning.push('⚠️ Experience level mismatch');
    }

    if (factors.experienceMatch.domainRelevance > 0.6) {
      reasoning.push('🏢 Relevant industry experience');
    }

    // Other factors
    if (factors.otherFactors.locationMatch > 0.8) {
      reasoning.push('📍 Location is a great fit');
    } else if (factors.otherFactors.locationMatch < 0.3) {
      reasoning.push('🌍 Location may be a challenge');
    }

    return reasoning;
  }

  /**
   * Update performance statistics
   */
  private updateStats(processingTime: number, matchScore: number): void {
    this.stats.totalCalculations++;

    // Update average processing time
    const alpha = 0.1; // Smoothing factor for running average
    this.stats.averageProcessingTime =
      this.stats.averageProcessingTime * (1 - alpha) + processingTime * alpha;

    // Update top match score
    if (matchScore > this.stats.topMatchScore) {
      this.stats.topMatchScore = matchScore;
    }

    // Update average match score
    this.stats.averageMatchScore =
      this.stats.averageMatchScore * (1 - alpha) + matchScore * alpha;

    this.stats.lastCalculatedAt = new Date();
  }

  /**
   * Get performance statistics
   */
  getStats(): MatchingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics (useful for testing/monitoring)
   */
  resetStats(): void {
    this.stats = {
      totalCalculations: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      lastCalculatedAt: new Date(),
      topMatchScore: 0,
      averageMatchScore: 0,
    };
  }
}

export const jobCandidateMatchingService = new JobCandidateMatchingService();

/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobCandidateMatchingService } from './jobCandidateMatching';
import type { Job } from '../../shared/types/job';
import type { CandidateProfile } from '../../shared/types/matching';

// Mock dependencies
vi.mock('../../monitoring/logger');
vi.mock('./skillNormalization');

describe('JobCandidateMatchingService', () => {
  let service: JobCandidateMatchingService;

  // Mock skill normalization service
  const mockSkillNormalizationService = {
    normalizeSkill: vi.fn(),
  };

  beforeEach(async () => {
    const skillNormModule = await import('./skillNormalization.js');
    vi.mocked(skillNormModule).skillNormalizationService =
      mockSkillNormalizationService as any;
  });

  const mockJob: Job = {
    _id: 'job123',
    workableId: 'workable123',
    title: 'Senior Software Engineer',
    description: 'Build scalable web applications using React and Node.js',
    requirements: 'Experience with JavaScript, React, Node.js, and MongoDB',
    location: 'San Francisco, CA',
    department: 'Engineering',
    employmentType: 'full-time',
    experienceLevel: 'senior',
    salary: {
      min: 120000,
      max: 180000,
      currency: 'USD',
    },
    company: 'TechCorp Inc',
    companyDescription: 'Leading technology company',
    status: 'active',
    postedAt: new Date('2023-10-01'),
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-10-30'),
    lastSyncedAt: new Date('2023-10-30'),
  };

  const mockCandidate: CandidateProfile = {
    userId: 'user123',
    summary: 'Experienced software engineer with React and Node.js expertise',
    skills: [
      {
        name: 'JavaScript',
        category: 'programming_languages',
        proficiency: 'expert',
        yearsOfExperience: 5,
      },
      {
        name: 'React',
        category: 'frameworks_libraries',
        proficiency: 'advanced',
        yearsOfExperience: 4,
      },
      {
        name: 'Node.js',
        category: 'frameworks_libraries',
        proficiency: 'advanced',
        yearsOfExperience: 3,
      },
    ],
    experience: [
      {
        company: 'Tech Solutions Inc',
        position: 'Senior Developer',
        startDate: '2020-01',
        endDate: '2023-01',
        isCurrent: false,
        description: 'Built web applications using React and Node.js',
        location: 'San Francisco, CA',
      },
      {
        company: 'StartupCorp',
        position: 'Full Stack Developer',
        startDate: '2018-01',
        endDate: '2020-01',
        isCurrent: false,
        description: 'Developed full-stack applications',
        location: 'San Francisco, CA',
      },
    ],
    education: [
      {
        institution: 'University of California',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2014-01',
        endDate: '2018-01',
      },
    ],
    vector: new Array(1536).fill(0.5), // Mock vector
    preferences: {
      locations: ['San Francisco', 'Remote'],
      employmentTypes: ['full-time'],
      salaryRange: {
        min: 130000,
        max: 190000,
        currency: 'USD',
      },
      remoteWork: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JobCandidateMatchingService();
    service.resetStats(); // Reset stats for clean testing

    // Setup default mock returns
    mockSkillNormalizationService.normalizeSkill.mockImplementation(
      (skill: string) => ({
        original: skill,
        normalized: skill,
        category: 'programming_languages',
        confidence: 1.0,
      })
    );
  });

  describe('calculateMatch', () => {
    it('should calculate match scores successfully', async () => {
      const result = await service.calculateMatch(mockJob, mockCandidate);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const match = result.value;
        expect(match.jobId).toBe('job123');
        expect(match.userId).toBe('user123');
        expect(match.score.overall).toBeGreaterThanOrEqual(0);
        expect(match.score.overall).toBeLessThanOrEqual(100);
        expect(match.reasoning).toBeInstanceOf(Array);
        expect(match.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should handle candidates with high skill matches', async () => {
      const highSkillCandidate = {
        ...mockCandidate,
        skills: [
          {
            name: 'JavaScript',
            category: 'programming_languages',
            proficiency: 'expert' as const,
          },
          {
            name: 'React',
            category: 'frameworks_libraries',
            proficiency: 'expert' as const,
          },
          {
            name: 'Node.js',
            category: 'frameworks_libraries',
            proficiency: 'expert' as const,
          },
          {
            name: 'MongoDB',
            category: 'databases',
            proficiency: 'advanced' as const,
          },
        ],
      };

      const result = await service.calculateMatch(mockJob, highSkillCandidate);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.score.skills).toBeGreaterThan(70);
      }
    });

    it('should handle candidates with missing skills', async () => {
      const lowSkillCandidate = {
        ...mockCandidate,
        skills: [
          {
            name: 'Python',
            category: 'programming_languages',
            proficiency: 'intermediate' as const,
          },
        ],
      };

      const result = await service.calculateMatch(mockJob, lowSkillCandidate);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.score.skills).toBeLessThan(50);
        expect(
          result.value.factors.skillsAlignment.missingSkills.length
        ).toBeGreaterThan(0);
      }
    });

    it('should consider experience level alignment', async () => {
      const juniorCandidate = {
        ...mockCandidate,
        experience: [
          {
            company: 'StartupCorp',
            position: 'Junior Developer',
            startDate: '2022-01',
            endDate: '2023-01',
            isCurrent: false,
          },
        ],
      };

      const seniorResult = await service.calculateMatch(mockJob, mockCandidate);
      const juniorResult = await service.calculateMatch(
        mockJob,
        juniorCandidate
      );

      expect(seniorResult.ok).toBe(true);
      expect(juniorResult.ok).toBe(true);

      if (seniorResult.ok && juniorResult.ok) {
        expect(seniorResult.value.score.experience).toBeGreaterThan(
          juniorResult.value.score.experience
        );
      }
    });

    it('should factor in salary alignment', async () => {
      const highSalaryCandidate = {
        ...mockCandidate,
        preferences: {
          ...mockCandidate.preferences!,
          salaryRange: {
            min: 200000,
            max: 300000,
            currency: 'USD',
          },
        },
      };

      const alignedResult = await service.calculateMatch(
        mockJob,
        mockCandidate
      );
      const misalignedResult = await service.calculateMatch(
        mockJob,
        highSalaryCandidate
      );

      expect(alignedResult.ok).toBe(true);
      expect(misalignedResult.ok).toBe(true);

      if (alignedResult.ok && misalignedResult.ok) {
        expect(
          alignedResult.value.factors.otherFactors.salaryAlignment
        ).toBeGreaterThan(
          misalignedResult.value.factors.otherFactors.salaryAlignment
        );
      }
    });

    it('should consider location preferences', async () => {
      const remoteCandidate = {
        ...mockCandidate,
        preferences: {
          ...mockCandidate.preferences!,
          locations: ['Remote'],
          remoteWork: true,
        },
      };

      const remoteJob = {
        ...mockJob,
        location: 'Remote',
      };

      const result = await service.calculateMatch(remoteJob, remoteCandidate);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.factors.otherFactors.locationMatch).toBe(1.0);
      }
    });

    it('should meet performance targets', async () => {
      const startTime = performance.now();
      const result = await service.calculateMatch(mockJob, mockCandidate);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      expect(result.ok).toBe(true);
      expect(processingTime).toBeLessThan(500); // Target: <500ms
    });
  });

  describe('calculateSkillsAlignment', () => {
    it('should calculate skills match ratio correctly', () => {
      // Access private method for testing
      const skillsAlignment = (service as any).calculateSkillsAlignment(
        mockJob,
        mockCandidate
      );

      expect(skillsAlignment.matchedSkills).toBeInstanceOf(Array);
      expect(skillsAlignment.missingSkills).toBeInstanceOf(Array);
      expect(skillsAlignment.skillsMatchRatio).toBeGreaterThanOrEqual(0);
      expect(skillsAlignment.skillsMatchRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateExperienceMatch', () => {
    it('should evaluate experience factors', () => {
      const experienceMatch = (service as any).calculateExperienceMatch(
        mockJob,
        mockCandidate
      );

      expect(experienceMatch.levelAlignment).toBeGreaterThanOrEqual(0);
      expect(experienceMatch.levelAlignment).toBeLessThanOrEqual(1);
      expect(experienceMatch.domainRelevance).toBeGreaterThanOrEqual(0);
      expect(experienceMatch.domainRelevance).toBeLessThanOrEqual(1);
      expect(experienceMatch.recencyBoost).toBeGreaterThanOrEqual(0);
      expect(experienceMatch.recencyBoost).toBeLessThanOrEqual(1);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0, 0];
      const similarity = (service as any).cosineSimilarity(vectorA, vectorB);

      expect(similarity).toBe(1); // Identical vectors should have similarity of 1
    });

    it('should handle orthogonal vectors', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const similarity = (service as any).cosineSimilarity(vectorA, vectorB);

      expect(similarity).toBe(0); // Orthogonal vectors should have similarity of 0
    });

    it('should handle mismatched vector lengths', () => {
      const vectorA = [1, 0];
      const vectorB = [1, 0, 0];
      const similarity = (service as any).cosineSimilarity(vectorA, vectorB);

      expect(similarity).toBe(0); // Mismatched lengths should return 0
    });
  });

  describe('inferCandidateExperienceLevel', () => {
    it('should correctly infer entry level', () => {
      const entryCandidate = {
        ...mockCandidate,
        experience: [
          {
            company: 'Company',
            position: 'Junior Dev',
            startDate: '2023-01',
            endDate: '2023-12',
            isCurrent: false,
          },
        ],
      };

      const level = (service as any).inferCandidateExperienceLevel(
        entryCandidate
      );
      expect(level).toBe('entry');
    });

    it('should correctly infer senior level', () => {
      const seniorCandidate = {
        ...mockCandidate,
        experience: [
          {
            company: 'Company1',
            position: 'Developer',
            startDate: '2018-01',
            endDate: '2021-01',
            isCurrent: false,
          },
          {
            company: 'Company2',
            position: 'Senior Developer',
            startDate: '2021-01',
            endDate: '2023-01',
            isCurrent: false,
          },
        ],
      };

      const level = (service as any).inferCandidateExperienceLevel(
        seniorCandidate
      );
      expect(level).toBe('senior');
    });
  });

  describe('generateMatchReasoning', () => {
    it('should generate meaningful reasoning for matches', () => {
      const mockFactors = {
        semanticSimilarity: 0.8,
        skillsAlignment: {
          matchedSkills: ['JavaScript', 'React'],
          missingSkills: ['MongoDB'],
          skillsMatchRatio: 0.75,
          proficiencyScore: 0.9,
        },
        experienceMatch: {
          levelAlignment: 0.8,
          domainRelevance: 0.7,
          recencyBoost: 0.9,
        },
        otherFactors: {
          locationMatch: 1.0,
          employmentTypeMatch: 1.0,
          salaryAlignment: 0.8,
          companyFit: 0.5,
        },
      };

      const mockScore = {
        overall: 85,
        semantic: 80,
        skills: 82,
        experience: 79,
        other: 83,
        confidence: 0.8,
      };

      const reasoning = (service as any).generateMatchReasoning(
        mockFactors,
        mockScore
      );

      expect(reasoning).toBeInstanceOf(Array);
      expect(reasoning.length).toBeGreaterThan(0);
      expect(reasoning[0]).toContain('Excellent match');
    });
  });

  describe('stats tracking', () => {
    it('should track performance statistics', async () => {
      const initialStats = service.getStats();
      expect(initialStats.totalCalculations).toBe(0);

      await service.calculateMatch(mockJob, mockCandidate);

      const updatedStats = service.getStats();
      expect(updatedStats.totalCalculations).toBe(1);
      expect(updatedStats.averageProcessingTime).toBeGreaterThan(0);
      expect(updatedStats.lastCalculatedAt).toBeInstanceOf(Date);
    });

    it('should reset statistics correctly', () => {
      service.resetStats();
      const stats = service.getStats();

      expect(stats.totalCalculations).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.topMatchScore).toBe(0);
      expect(stats.averageMatchScore).toBe(0);
    });
  });

  describe('custom weights', () => {
    it('should apply custom weights correctly', async () => {
      const customWeights = {
        semantic: 0.6,
        skills: 0.2,
        experience: 0.1,
        other: 0.1,
      };

      const result = await service.calculateMatch(mockJob, mockCandidate, {
        weights: customWeights,
      });

      expect(result.ok).toBe(true);
      // The overall score should be different with custom weights
    });
  });
});

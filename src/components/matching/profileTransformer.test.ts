import { describe, it, expect } from 'vitest';
import {
  extractedProfileToCandidateProfile,
  isProfileReadyForMatching,
  calculateProfileCompleteness,
  getProfileSearchTerms,
} from './profileTransformer';
import type { ExtractedProfile } from '../../shared/types/profile';

describe('profileTransformer', () => {
  const mockExtractedProfile: ExtractedProfile = {
    summary: 'Senior Software Engineer with 8 years experience',
    skills: [
      {
        name: 'React',
        category: 'frameworks_libraries',
        proficiency: 'expert',
        yearsOfExperience: 5,
      },
      {
        name: 'TypeScript',
        category: 'programming_languages',
        proficiency: 'advanced',
        yearsOfExperience: 4,
      },
      {
        name: 'Node.js',
        category: 'frameworks_libraries',
        proficiency: 'advanced',
        yearsOfExperience: 6,
      },
    ],
    experience: [
      {
        company: 'Google',
        position: 'Senior Engineer',
        startDate: '2020-01',
        endDate: '2023-12',
        isCurrent: false,
        description: 'Led frontend development',
        skills: ['React', 'TypeScript'],
        location: 'Mountain View, CA',
        achievements: ['Improved performance by 40%'],
      },
      {
        company: 'Startup Inc',
        position: 'Tech Lead',
        startDate: '2024-01',
        isCurrent: true,
        description: 'Leading engineering team',
        skills: ['React', 'Node.js'],
      },
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'BS',
        fieldOfStudy: 'Computer Science',
        startDate: '2012',
        endDate: '2016',
        grade: '3.8',
        description: 'Focus on AI and ML',
      },
    ],
    extractedAt: '2024-01-15T10:00:00Z',
    extractionStatus: 'completed',
    costEstimate: 250,
  };

  describe('extractedProfileToCandidateProfile', () => {
    it('converts ExtractedProfile to CandidateProfile format', () => {
      const result = extractedProfileToCandidateProfile(
        'user-123',
        mockExtractedProfile
      );

      expect(result.userId).toBe('user-123');
      expect(result.summary).toBe(mockExtractedProfile.summary);
      expect(result.skills).toHaveLength(3);
      expect(result.experience).toHaveLength(2);
      expect(result.education).toHaveLength(1);
    });

    it('preserves skill details correctly', () => {
      const result = extractedProfileToCandidateProfile(
        'user-123',
        mockExtractedProfile
      );

      expect(result.skills[0]).toEqual({
        name: 'React',
        category: 'frameworks_libraries',
        proficiency: 'expert',
        yearsOfExperience: 5,
      });
    });

    it('removes achievements from experience entries', () => {
      const result = extractedProfileToCandidateProfile(
        'user-123',
        mockExtractedProfile
      );

      expect(result.experience[0]).not.toHaveProperty('achievements');
      expect(result.experience[0].company).toBe('Google');
      expect(result.experience[0].location).toBe('Mountain View, CA');
    });

    it('removes grade and description from education entries', () => {
      const result = extractedProfileToCandidateProfile(
        'user-123',
        mockExtractedProfile
      );

      expect(result.education[0]).not.toHaveProperty('grade');
      expect(result.education[0]).not.toHaveProperty('description');
      expect(result.education[0].institution).toBe('Stanford University');
    });

    it('includes vector embeddings when provided', () => {
      const vector = [0.1, 0.2, 0.3];
      const result = extractedProfileToCandidateProfile(
        'user-123',
        mockExtractedProfile,
        vector
      );

      expect(result.vector).toEqual(vector);
    });

    it('includes preferences when provided', () => {
      const preferences = {
        locations: ['San Francisco', 'Remote'],
        employmentTypes: ['full-time'],
        remoteWork: true,
      };
      const result = extractedProfileToCandidateProfile(
        'user-123',
        mockExtractedProfile,
        undefined,
        preferences
      );

      expect(result.preferences).toEqual(preferences);
    });
  });

  describe('isProfileReadyForMatching', () => {
    it('returns true for completed profile with skills', () => {
      const result = isProfileReadyForMatching(mockExtractedProfile);
      expect(result).toBe(true);
    });

    it('returns false for pending extraction', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        extractionStatus: 'pending',
      };
      const result = isProfileReadyForMatching(profile);
      expect(result).toBe(false);
    });

    it('returns false for processing extraction', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        extractionStatus: 'processing',
      };
      const result = isProfileReadyForMatching(profile);
      expect(result).toBe(false);
    });

    it('returns false for failed extraction', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        extractionStatus: 'failed',
        extractionError: 'Failed to parse resume',
      };
      const result = isProfileReadyForMatching(profile);
      expect(result).toBe(false);
    });

    it('returns false when extraction has errors', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        extractionError: 'Some error occurred',
      };
      const result = isProfileReadyForMatching(profile);
      expect(result).toBe(false);
    });

    it('returns true for profile with experience but no skills', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        skills: [],
      };
      const result = isProfileReadyForMatching(profile);
      expect(result).toBe(true);
    });

    it('returns true for profile with skills but no experience', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        experience: [],
      };
      const result = isProfileReadyForMatching(profile);
      expect(result).toBe(true);
    });

    it('returns false for profile with neither skills nor experience', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        skills: [],
        experience: [],
      };
      const result = isProfileReadyForMatching(profile);
      expect(result).toBe(false);
    });
  });

  describe('calculateProfileCompleteness', () => {
    it('returns 100 for fully complete profile', () => {
      const score = calculateProfileCompleteness(mockExtractedProfile);
      expect(score).toBeGreaterThanOrEqual(95);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('gives partial credit for short summary', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        summary: 'Short',
      };
      const fullScore = calculateProfileCompleteness(mockExtractedProfile);
      const partialScore = calculateProfileCompleteness(profile);
      expect(partialScore).toBeLessThan(fullScore);
    });

    it('scales skills score based on count', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        skills: [mockExtractedProfile.skills[0]],
      };
      const fullScore = calculateProfileCompleteness(mockExtractedProfile);
      const partialScore = calculateProfileCompleteness(profile);
      expect(partialScore).toBeLessThan(fullScore);
    });

    it('gives bonus for skill proficiency levels', () => {
      const withProficiency =
        calculateProfileCompleteness(mockExtractedProfile);

      const withoutProficiency: ExtractedProfile = {
        ...mockExtractedProfile,
        skills: mockExtractedProfile.skills.map(s => ({
          ...s,
          proficiency: undefined,
        })),
      };
      const noProficiencyScore =
        calculateProfileCompleteness(withoutProficiency);

      expect(withProficiency).toBeGreaterThan(noProficiencyScore);
    });

    it('scales experience score based on count', () => {
      const profile: ExtractedProfile = {
        ...mockExtractedProfile,
        experience: [mockExtractedProfile.experience[0]],
      };
      const fullScore = calculateProfileCompleteness(mockExtractedProfile);
      const partialScore = calculateProfileCompleteness(profile);
      expect(partialScore).toBeLessThan(fullScore);
    });

    it('gives bonus for detailed experience descriptions', () => {
      const withDetails = calculateProfileCompleteness(mockExtractedProfile);

      const withoutDetails: ExtractedProfile = {
        ...mockExtractedProfile,
        experience: mockExtractedProfile.experience.map(exp => ({
          ...exp,
          description: 'Short',
        })),
      };
      const noDetailsScore = calculateProfileCompleteness(withoutDetails);

      expect(withDetails).toBeGreaterThan(noDetailsScore);
    });

    it('caps score at 100', () => {
      const score = calculateProfileCompleteness(mockExtractedProfile);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns low score for minimal profile', () => {
      const minimal: ExtractedProfile = {
        skills: [{ name: 'JavaScript', category: 'programming_languages' }],
        experience: [],
        education: [],
        extractedAt: '2024-01-15T10:00:00Z',
        extractionStatus: 'completed',
      };
      const score = calculateProfileCompleteness(minimal);
      expect(score).toBeLessThan(40);
    });
  });

  describe('getProfileSearchTerms', () => {
    it('extracts skill names', () => {
      const terms = getProfileSearchTerms(mockExtractedProfile);
      expect(terms).toContain('react');
      expect(terms).toContain('typescript');
      expect(terms).toContain('node.js');
    });

    it('extracts company names', () => {
      const terms = getProfileSearchTerms(mockExtractedProfile);
      expect(terms).toContain('google');
      expect(terms).toContain('startup inc');
    });

    it('extracts position titles', () => {
      const terms = getProfileSearchTerms(mockExtractedProfile);
      expect(terms).toContain('senior engineer');
      expect(terms).toContain('tech lead');
    });

    it('extracts education institutions', () => {
      const terms = getProfileSearchTerms(mockExtractedProfile);
      expect(terms).toContain('stanford university');
    });

    it('extracts degree and field of study', () => {
      const terms = getProfileSearchTerms(mockExtractedProfile);
      expect(terms).toContain('bs');
      expect(terms).toContain('computer science');
    });

    it('returns lowercase terms', () => {
      const terms = getProfileSearchTerms(mockExtractedProfile);
      terms.forEach(term => {
        expect(term).toBe(term.toLowerCase());
      });
    });

    it('returns unique terms', () => {
      const terms = getProfileSearchTerms(mockExtractedProfile);
      const uniqueTerms = [...new Set(terms)];
      expect(terms.length).toBe(uniqueTerms.length);
    });

    it('handles profiles with missing optional fields', () => {
      const minimal: ExtractedProfile = {
        skills: [{ name: 'JavaScript', category: 'programming_languages' }],
        experience: [
          {
            company: 'Acme Corp',
            position: 'Developer',
            startDate: '2020',
            isCurrent: true,
          },
        ],
        education: [
          {
            institution: 'MIT',
          },
        ],
        extractedAt: '2024-01-15T10:00:00Z',
        extractionStatus: 'completed',
      };
      const terms = getProfileSearchTerms(minimal);
      expect(terms).toContain('javascript');
      expect(terms).toContain('acme corp');
      expect(terms).toContain('mit');
    });
  });
});

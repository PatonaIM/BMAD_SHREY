import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  calculateSkillOverlap,
  calculateExperienceMatch,
  calculateAdditionalFactors,
  calculateProactiveMatchScore,
  meetsProactiveMatchThresholds,
} from '../candidateMatching';

describe('Candidate Matching Algorithms', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vector = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vector, vector)).toBe(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vectorA = [1, 0];
      const vectorB = [0, 1];
      expect(cosineSimilarity(vectorA, vectorB)).toBe(0);
    });

    it('should calculate similarity for opposite vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [-1, -2, -3];
      expect(cosineSimilarity(vectorA, vectorB)).toBe(-1);
    });

    it('should handle vectors with different magnitudes', () => {
      const vectorA = [3, 4];
      const vectorB = [6, 8];
      expect(cosineSimilarity(vectorA, vectorB)).toBeCloseTo(1, 5);
    });

    it('should return 0 for invalid vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([1, 2], [1])).toBe(0);
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it('should handle null/undefined values in vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2, undefined as unknown as number];
      expect(cosineSimilarity(vectorA, vectorB)).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 2, 3];
      expect(cosineSimilarity(vectorA, vectorB)).toBe(0);
    });

    it('should calculate similarity for typical embedding vectors', () => {
      const vectorA = [0.5, 0.3, 0.8, 0.1, 0.6];
      const vectorB = [0.4, 0.3, 0.7, 0.2, 0.5];
      const result = cosineSimilarity(vectorA, vectorB);
      expect(result).toBeGreaterThan(0.9);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateSkillOverlap', () => {
    it('should find exact skill matches', () => {
      const candidateSkills = ['JavaScript', 'Python', 'React'];
      const requiredSkills = ['JavaScript', 'React'];
      const result = calculateSkillOverlap(candidateSkills, requiredSkills);

      expect(result.matched).toEqual(['JavaScript', 'React']);
      expect(result.missing).toEqual([]);
      expect(result.overlapPercentage).toBe(1);
    });

    it('should identify missing skills', () => {
      const candidateSkills = ['JavaScript', 'Python'];
      const requiredSkills = ['JavaScript', 'TypeScript', 'React'];
      const result = calculateSkillOverlap(candidateSkills, requiredSkills);

      expect(result.matched).toEqual(['JavaScript']);
      expect(result.missing).toEqual(['TypeScript', 'React']);
      expect(result.overlapPercentage).toBeCloseTo(0.333, 2);
    });

    it('should handle case-insensitive matching', () => {
      const candidateSkills = ['javascript', 'PYTHON'];
      const requiredSkills = ['JavaScript', 'Python'];
      const result = calculateSkillOverlap(candidateSkills, requiredSkills);

      expect(result.matched.length).toBe(2);
      expect(result.overlapPercentage).toBe(1);
    });

    it('should handle empty skill arrays', () => {
      const result1 = calculateSkillOverlap([], ['JavaScript']);
      expect(result1.overlapPercentage).toBe(0);
      expect(result1.missing).toEqual(['JavaScript']);

      const result2 = calculateSkillOverlap(['JavaScript'], []);
      expect(result2.overlapPercentage).toBe(0);
      expect(result2.matched).toEqual([]);

      const result3 = calculateSkillOverlap([], []);
      expect(result3.overlapPercentage).toBe(0);
    });

    it('should trim whitespace from skills', () => {
      const candidateSkills = ['  JavaScript  ', 'Python'];
      const requiredSkills = ['JavaScript', '  Python  '];
      const result = calculateSkillOverlap(candidateSkills, requiredSkills);

      expect(result.matched.length).toBe(2);
      expect(result.overlapPercentage).toBe(1);
    });

    it('should handle duplicate skills', () => {
      const candidateSkills = ['JavaScript', 'JavaScript', 'Python'];
      const requiredSkills = ['JavaScript', 'Python'];
      const result = calculateSkillOverlap(candidateSkills, requiredSkills);

      expect(result.matched.length).toBe(2);
      expect(result.overlapPercentage).toBe(1);
    });

    it('should calculate partial overlap', () => {
      const candidateSkills = ['JavaScript', 'Python', 'Java', 'C++'];
      const requiredSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js'];
      const result = calculateSkillOverlap(candidateSkills, requiredSkills);

      expect(result.matched).toEqual(['JavaScript']);
      expect(result.missing.length).toBe(3);
      expect(result.overlapPercentage).toBe(0.25);
    });
  });

  describe('calculateExperienceMatch', () => {
    it('should give perfect score for exact match', () => {
      const result = calculateExperienceMatch(5, 5);
      expect(result.score).toBe(1);
      expect(result.candidateYears).toBe(5);
      expect(result.requiredYears).toBe(5);
    });

    it('should score well for candidates meeting requirements', () => {
      const result = calculateExperienceMatch(7, 5);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should penalize significantly underqualified candidates', () => {
      const result = calculateExperienceMatch(2, 10);
      expect(result.score).toBeLessThan(0.5);
    });

    it('should slightly penalize overqualified candidates', () => {
      const result1 = calculateExperienceMatch(15, 5);
      const result2 = calculateExperienceMatch(5, 5);
      expect(result1.score).toBeLessThan(result2.score);
    });

    it('should handle zero experience requirement', () => {
      const result1 = calculateExperienceMatch(0, 0);
      expect(result1.score).toBe(1);

      const result2 = calculateExperienceMatch(3, 0);
      expect(result2.score).toBe(1);
    });

    it('should handle undefined experience values', () => {
      const result1 = calculateExperienceMatch(0, 5);
      expect(result1.score).toBeGreaterThanOrEqual(0);

      const result2 = calculateExperienceMatch(5, 0);
      expect(result2.score).toBe(1);

      const result3 = calculateExperienceMatch(0, 0);
      expect(result3.score).toBe(1);
    });

    it('should handle negative values gracefully', () => {
      const result = calculateExperienceMatch(-1, 5);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should score entry-level candidates appropriately', () => {
      const result = calculateExperienceMatch(1, 2);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.score).toBeLessThan(1);
    });

    it('should score senior candidates appropriately', () => {
      const result = calculateExperienceMatch(12, 10);
      expect(result.score).toBeGreaterThan(0.8);
    });
  });

  describe('calculateAdditionalFactors', () => {
    it('should give perfect score for matching location', () => {
      const result = calculateAdditionalFactors(
        'San Francisco',
        'San Francisco'
      );
      expect(result).toBe(1);
    });

    it('should handle case-insensitive location matching', () => {
      const result = calculateAdditionalFactors(
        'san francisco',
        'San Francisco'
      );
      expect(result).toBe(1);
    });

    it('should score well when both positions are remote', () => {
      const result = calculateAdditionalFactors(
        'New York',
        'San Francisco',
        true,
        true
      );
      expect(result).toBe(1);
    });

    it('should score well when candidate is remote-willing for remote job', () => {
      const result = calculateAdditionalFactors(
        'New York',
        'San Francisco',
        true,
        true
      );
      expect(result).toBe(1);
    });

    it('should give partial score for location mismatch', () => {
      const result = calculateAdditionalFactors('New York', 'San Francisco');
      expect(result).toBe(0.5);
    });

    it('should handle undefined locations', () => {
      const result1 = calculateAdditionalFactors(undefined, 'San Francisco');
      expect(result1).toBe(0.5);

      const result2 = calculateAdditionalFactors('San Francisco', undefined);
      expect(result2).toBe(0.5);

      const result3 = calculateAdditionalFactors(undefined, undefined);
      expect(result3).toBe(0.5);
    });

    it('should handle partial location matches', () => {
      const result = calculateAdditionalFactors(
        'San Francisco, CA',
        'San Francisco'
      );
      expect(result).toBe(1);
    });
  });

  describe('calculateProactiveMatchScore', () => {
    it('should calculate comprehensive match score', () => {
      const semanticSimilarity = 0.95;
      const candidateSkills = ['JavaScript', 'Python', 'React'];
      const requiredSkills = ['JavaScript', 'React', 'Node.js'];

      const result = calculateProactiveMatchScore(
        semanticSimilarity,
        candidateSkills,
        requiredSkills,
        5,
        5,
        'San Francisco',
        'San Francisco'
      );

      expect(result.total).toBeGreaterThan(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(result.breakdown.semantic).toBeGreaterThan(0);
      expect(result.breakdown.skills).toBeGreaterThan(0);
      expect(result.breakdown.experience).toBeGreaterThan(0);
      expect(result.breakdown.additional).toBeGreaterThan(0);
      expect(result.matchedSkills).toEqual(['JavaScript', 'React']);
      expect(result.missingSkills).toEqual(['Node.js']);
    });

    it('should give high score for perfect match', () => {
      const skills = ['JavaScript', 'React', 'Node.js'];

      const result = calculateProactiveMatchScore(
        1.0,
        skills,
        skills,
        5,
        5,
        'Remote',
        'Remote'
      );

      expect(result.total).toBeGreaterThan(95);
    });

    it('should give low score for poor match', () => {
      const candidateSkills = ['Java', 'C++'];
      const requiredSkills = ['JavaScript', 'Python'];

      const result = calculateProactiveMatchScore(
        0.1,
        candidateSkills,
        requiredSkills,
        2,
        10,
        'New York',
        'San Francisco'
      );

      expect(result.total).toBeLessThan(30);
    });

    it('should weight semantic similarity correctly (40%)', () => {
      const result = calculateProactiveMatchScore(1.0, [], [], 0, 0);

      // Semantic similarity (100%) * 0.4 * 100 = 40%
      expect(result.breakdown.semantic).toBeCloseTo(40, 1);
    });

    it('should weight skill overlap correctly (35%)', () => {
      const skills = ['JavaScript', 'React'];
      const result = calculateProactiveMatchScore(1.0, skills, skills, 5, 5);

      // Skills (100%) * 0.35 * 100 = 35%
      expect(result.breakdown.skills).toBeCloseTo(35, 1);
    });

    it('should handle missing candidate information gracefully', () => {
      const result = calculateProactiveMatchScore(
        0.8,
        [],
        ['JavaScript'],
        0,
        5
      );

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
    });

    it('should return skills breakdown correctly', () => {
      const candidateSkills = ['JavaScript', 'Python', 'Java'];
      const requiredSkills = ['JavaScript', 'Python', 'TypeScript'];

      const result = calculateProactiveMatchScore(
        0.9,
        candidateSkills,
        requiredSkills,
        5,
        5
      );

      expect(result.matchedSkills).toContain('JavaScript');
      expect(result.matchedSkills).toContain('Python');
      expect(result.missingSkills).toContain('TypeScript');
    });
  });

  describe('meetsProactiveMatchThresholds', () => {
    it('should pass for high score with complete profile', () => {
      const matchScore = {
        total: 85,
        breakdown: { semantic: 40, skills: 30, experience: 10, additional: 5 },
        matchedSkills: ['JavaScript'],
        missingSkills: [],
      };
      expect(meetsProactiveMatchThresholds(matchScore, true, false, 70)).toBe(
        true
      );
    });

    it('should fail for incomplete profile', () => {
      const matchScore = {
        total: 85,
        breakdown: { semantic: 40, skills: 30, experience: 10, additional: 5 },
        matchedSkills: [],
        missingSkills: [],
      };
      expect(meetsProactiveMatchThresholds(matchScore, false, false, 70)).toBe(
        false
      );
    });

    it('should fail for low score', () => {
      const matchScore = {
        total: 60,
        breakdown: { semantic: 20, skills: 20, experience: 10, additional: 10 },
        matchedSkills: [],
        missingSkills: [],
      };
      expect(meetsProactiveMatchThresholds(matchScore, true, false, 70)).toBe(
        false
      );
    });

    it('should lower threshold for candidates with AI interview', () => {
      const matchScore = {
        total: 68,
        breakdown: { semantic: 30, skills: 25, experience: 10, additional: 3 },
        matchedSkills: [],
        missingSkills: [],
      };
      expect(meetsProactiveMatchThresholds(matchScore, true, true, 70)).toBe(
        true
      );
    });

    it('should respect custom minimum score', () => {
      const matchScore = {
        total: 82,
        breakdown: { semantic: 35, skills: 30, experience: 12, additional: 5 },
        matchedSkills: [],
        missingSkills: [],
      };
      expect(meetsProactiveMatchThresholds(matchScore, true, false, 85)).toBe(
        false
      );
      expect(meetsProactiveMatchThresholds(matchScore, true, false, 80)).toBe(
        true
      );
    });

    it('should handle edge cases', () => {
      const matchScore = {
        total: 70,
        breakdown: { semantic: 30, skills: 25, experience: 10, additional: 5 },
        matchedSkills: [],
        missingSkills: [],
      };
      expect(meetsProactiveMatchThresholds(matchScore, true, false, 70)).toBe(
        true
      );
    });
  });
});

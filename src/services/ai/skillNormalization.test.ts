import { describe, it, expect, beforeEach } from 'vitest';
import { SkillNormalizationService } from './skillNormalization';

describe('SkillNormalizationService', () => {
  let service: SkillNormalizationService;

  beforeEach(() => {
    service = new SkillNormalizationService();
  });

  describe('normalizeSkill', () => {
    it('should normalize exact matches', () => {
      const result = service.normalizeSkill('JavaScript');
      expect(result.normalized).toBe('JavaScript');
      expect(result.category).toBe('programming_languages');
      expect(result.confidence).toBe(1.0);
    });

    it('should normalize variations', () => {
      const result = service.normalizeSkill('js');
      expect(result.normalized).toBe('JavaScript');
      expect(result.category).toBe('programming_languages');
      expect(result.confidence).toBe(1.0);
    });

    it('should handle case insensitive matching', () => {
      const result = service.normalizeSkill('REACT');
      expect(result.normalized).toBe('React');
      expect(result.category).toBe('frameworks_libraries');
    });

    it('should clean skill names', () => {
      const result = service.normalizeSkill('  React.js  ');
      expect(result.normalized).toBe('React');
      expect(result.category).toBe('frameworks_libraries');
    });

    it('should handle unknown skills with category guessing', () => {
      const result = service.normalizeSkill('SomeFramework');
      expect(result.normalized).toBe('Someframework'); // Capitalized
      expect(result.category).toBe('other'); // Default category
      expect(result.confidence).toBe(0.5);
    });

    it('should guess programming language category', () => {
      const result = service.normalizeSkill('NewPython');
      expect(result.category).toBe('programming_languages');
    });

    it('should guess frameworks category', () => {
      const result = service.normalizeSkill('MyReact');
      expect(result.category).toBe('frameworks_libraries');
    });

    it('should guess database category', () => {
      const result = service.normalizeSkill('MyMongoDB');
      expect(result.category).toBe('databases');
    });
  });

  describe('normalizeSkills', () => {
    it('should normalize multiple skills', () => {
      const skills = ['js', 'react', 'node.js', 'mongodb'];
      const results = service.normalizeSkills(skills);

      expect(results).toHaveLength(4);
      expect(results[0]?.normalized).toBe('JavaScript');
      expect(results[1]?.normalized).toBe('React');
      expect(results[2]?.normalized).toBe('Node.js');
      expect(results[3]?.normalized).toBe('MongoDB');
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return skills for programming languages category', () => {
      const skills = service.getSkillsByCategory('programming_languages');
      expect(skills).toContain('JavaScript');
      expect(skills).toContain('Python');
      expect(skills).toContain('Java');
    });

    it('should return skills for frameworks category', () => {
      const skills = service.getSkillsByCategory('frameworks_libraries');
      expect(skills).toContain('React');
      expect(skills).toContain('Angular');
      expect(skills).toContain('Vue.js');
    });

    it('should return empty array for unknown category', () => {
      const skills = service.getSkillsByCategory('nonexistent');
      expect(skills).toEqual([]);
    });
  });

  describe('fuzzy matching', () => {
    it('should find partial matches', () => {
      const result = service.normalizeSkill('PostgreSQLDatabase');
      expect(result.normalized).toBe('PostgreSQL');
      expect(result.category).toBe('databases');
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('special capitalization', () => {
    it('should handle special cases correctly', () => {
      const testCases = [
        { input: 'javascript', expected: 'JavaScript' },
        { input: 'typescript', expected: 'TypeScript' },
        { input: 'nodejs', expected: 'Node.js' },
        { input: 'mongodb', expected: 'MongoDB' },
        { input: 'postgresql', expected: 'PostgreSQL' },
      ];

      for (const testCase of testCases) {
        const result = service.normalizeSkill(testCase.input);
        expect(result.normalized).toBe(testCase.expected);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = service.normalizeSkill('');
      expect(result.original).toBe('');
      expect(result.normalized).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const result = service.normalizeSkill('   ');
      expect(result.normalized).toBe('');
    });

    it('should remove common suffixes', () => {
      const result = service.normalizeSkill('React Framework');
      expect(result.normalized).toBe('React');
    });
  });

  describe('addMapping', () => {
    it('should allow adding new mappings dynamically', () => {
      service.addMapping({
        canonical: 'TestSkill',
        variations: ['test', 'testing'],
        category: 'testing_tools',
      });

      const result = service.normalizeSkill('test');
      expect(result.normalized).toBe('TestSkill');
      expect(result.category).toBe('testing_tools');
    });
  });
});

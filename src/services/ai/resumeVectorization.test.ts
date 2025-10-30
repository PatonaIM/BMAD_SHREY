/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeVectorizationService } from './resumeVectorization';
import type { ExtractedProfile } from '../../shared/types/profile';
import type { ProfileChangeEvent } from '../../shared/types/vector';

// Mock dependencies
vi.mock('../../ai/openai/client');
vi.mock('../../monitoring/logger');
vi.mock('../../data-access/repositories/resumeVectorRepo');
vi.mock('../../data-access/repositories/extractedProfileRepo');

// Mock OpenAI client
const mockOpenAI = {
  embeddings: {
    create: vi.fn(),
  },
};

// Mock the getOpenAI function
const mockGetOpenAI = vi.fn().mockResolvedValue(mockOpenAI);
vi.doMock('../../ai/openai/client', () => ({
  getOpenAI: mockGetOpenAI,
}));

// Mock repositories
const mockResumeVectorRepo = {
  upsert: vi.fn(),
  getByProfileId: vi.fn(),
  vectorSearch: vi.fn(),
  deleteByProfileId: vi.fn(),
  getStats: vi.fn(),
};

const mockGetExtractedProfile = vi.fn();

vi.doMock('../../data-access/repositories/resumeVectorRepo', () => ({
  resumeVectorRepo: mockResumeVectorRepo,
}));

vi.doMock('../../data-access/repositories/extractedProfileRepo', () => ({
  getExtractedProfile: mockGetExtractedProfile,
}));

describe('ResumeVectorizationService', () => {
  let service: ResumeVectorizationService;
  const mockProfile: ExtractedProfile = {
    summary: 'Experienced software engineer',
    skills: [
      { name: 'JavaScript', category: 'programming_languages' },
      { name: 'React', category: 'frameworks_libraries' },
    ],
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Developer',
        startDate: '2020-01',
        endDate: '2023-01',
        isCurrent: false,
        description: 'Built scalable web applications',
      },
    ],
    education: [
      {
        institution: 'University of Technology',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
      },
    ],
    extractedAt: '2023-10-30T10:00:00Z',
    extractionStatus: 'completed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ResumeVectorizationService();
  });

  describe('vectorizeProfile', () => {
    it('should successfully vectorize a profile', async () => {
      const mockEmbeddings = new Array(1536).fill(0.1);

      mockGetExtractedProfile.mockResolvedValue(mockProfile);
      mockResumeVectorRepo.getByProfileId.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings }],
        usage: { total_tokens: 100 },
      });
      mockResumeVectorRepo.upsert.mockResolvedValue({ ok: true, value: {} });

      const result = await service.vectorizeProfile('user123', 'profile456');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.userId).toBe('user123');
        expect(result.value.profileId).toBe('profile456');
        expect(result.value.embeddings).toEqual(mockEmbeddings);
        expect(result.value.dimensions).toBe(1536);
        expect(result.value.model).toBe('text-embedding-3-small');
      }
    });

    it('should return existing vector when not forcing refresh', async () => {
      const existingVector = {
        _id: 'profile456',
        userId: 'user123',
        profileId: 'profile456',
        embeddings: new Array(1536).fill(0.2),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        content: 'existing content',
        version: 1,
        createdAt: '2023-10-29T10:00:00Z',
        updatedAt: '2023-10-29T10:00:00Z',
      };

      mockGetExtractedProfile.mockResolvedValue(mockProfile);
      mockResumeVectorRepo.getByProfileId.mockResolvedValue(existingVector);

      const result = await service.vectorizeProfile('user123', 'profile456');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.profileId).toBe('profile456');
        expect(result.value.version).toBe(1);
      }
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it('should handle profile not found error', async () => {
      mockGetExtractedProfile.mockResolvedValue(null);

      const result = await service.vectorizeProfile('user123', 'profile456');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('not_found');
      }
    });

    it('should handle OpenAI API errors', async () => {
      mockGetExtractedProfile.mockResolvedValue(mockProfile);
      mockResumeVectorRepo.getByProfileId.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockRejectedValue(
        new Error('OpenAI API error')
      );

      const result = await service.vectorizeProfile('user123', 'profile456');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('embedding_error');
        expect(result.error.message).toContain('OpenAI API error');
      }
    });
  });

  describe('prepareContentForVectorization', () => {
    it('should combine all profile sections into searchable text', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (service as any).prepareContentForVectorization(
        mockProfile
      );

      expect(content).toContain('Summary: Experienced software engineer');
      expect(content).toContain('Skills: JavaScript, React');
      expect(content).toContain('Experience: Tech Corp - Senior Developer');
      expect(content).toContain('Education: University of Technology');
    });

    it('should handle empty sections gracefully', () => {
      const emptyProfile: ExtractedProfile = {
        skills: [],
        experience: [],
        education: [],
        extractedAt: '2023-10-30T10:00:00Z',
        extractionStatus: 'completed',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (service as any).prepareContentForVectorization(
        emptyProfile
      );

      expect(content).toBe('');
    });
  });

  describe('shouldRevectorize', () => {
    it('should return true for profile creation', () => {
      const changeEvent: ProfileChangeEvent = {
        userId: 'user123',
        profileId: 'profile456',
        changeType: 'created',
        significance: 'major',
        changedFields: ['summary'],
        timestamp: new Date(),
      };

      const result = service.shouldRevectorize(changeEvent);
      expect(result).toBe(true);
    });

    it('should return true for profile deletion', () => {
      const changeEvent: ProfileChangeEvent = {
        userId: 'user123',
        profileId: 'profile456',
        changeType: 'deleted',
        significance: 'major',
        changedFields: [],
        timestamp: new Date(),
      };

      const result = service.shouldRevectorize(changeEvent);
      expect(result).toBe(true);
    });

    it('should return true for major changes', () => {
      const changeEvent: ProfileChangeEvent = {
        userId: 'user123',
        profileId: 'profile456',
        changeType: 'updated',
        significance: 'major',
        changedFields: ['summary'],
        timestamp: new Date(),
      };

      const result = service.shouldRevectorize(changeEvent);
      expect(result).toBe(true);
    });

    it('should return true when major fields are changed', () => {
      const changeEvent: ProfileChangeEvent = {
        userId: 'user123',
        profileId: 'profile456',
        changeType: 'updated',
        significance: 'minor',
        changedFields: ['skills.0.name', 'experience.0.description'],
        timestamp: new Date(),
      };

      const result = service.shouldRevectorize(changeEvent);
      expect(result).toBe(true);
    });

    it('should return false for minor changes', () => {
      const changeEvent: ProfileChangeEvent = {
        userId: 'user123',
        profileId: 'profile456',
        changeType: 'updated',
        significance: 'minor',
        changedFields: ['lastLoginAt'],
        timestamp: new Date(),
      };

      const result = service.shouldRevectorize(changeEvent);
      expect(result).toBe(false);
    });
  });

  describe('searchSimilarProfiles', () => {
    it('should search for similar profiles', async () => {
      const queryVector = new Array(1536).fill(0.5);
      const mockResults = [
        { userId: 'user456', score: 0.95 },
        { userId: 'user789', score: 0.87 },
      ];

      mockResumeVectorRepo.vectorSearch.mockResolvedValue(mockResults);

      const result = await service.searchSimilarProfiles(queryVector, 10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(mockResults);
      }
      expect(mockResumeVectorRepo.vectorSearch).toHaveBeenCalledWith({
        vector: queryVector,
        limit: 10,
        filter: undefined,
      });
    });

    it('should exclude specific user from search', async () => {
      const queryVector = new Array(1536).fill(0.5);
      const mockResults = [{ userId: 'user456', score: 0.95 }];

      mockResumeVectorRepo.vectorSearch.mockResolvedValue(mockResults);

      await service.searchSimilarProfiles(queryVector, 10, 'user123');

      expect(mockResumeVectorRepo.vectorSearch).toHaveBeenCalledWith({
        vector: queryVector,
        limit: 10,
        filter: { userId: { $ne: 'user123' } },
      });
    });
  });

  describe('getVectorizationStats', () => {
    it('should return vectorization statistics', async () => {
      const mockStats = {
        totalVectors: 150,
        averageDimensions: 1536,
        latestModel: 'text-embedding-3-small',
        oldestVector: new Date('2023-01-01'),
        newestVector: new Date('2023-10-30'),
      };

      mockResumeVectorRepo.getStats.mockResolvedValue(mockStats);

      const result = await service.getVectorizationStats();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(mockStats);
      }
    });
  });
});

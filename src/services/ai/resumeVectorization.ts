/**
 * Resume Vectorization Service
 *
 * Generates semantic embeddings for resumes using OpenAI's embedding API
 * and stores them in MongoDB Atlas for vector search capabilities.
 */

import { getOpenAI } from '../../ai/openai/client';
import { logger } from '../../monitoring/logger';
import { ok, err, type Result } from '../../shared/result';
import type {
  ResumeVector,
  ProfileChangeEvent,
} from '../../shared/types/vector';
import type { ExtractedProfile } from '../../shared/types/profile';
import { resumeVectorRepo } from '../../data-access/repositories/resumeVectorRepo';
import { getExtractedProfile } from '../../data-access/repositories/extractedProfileRepo';

export interface VectorizationCost {
  tokensUsed: number;
  costCents: number;
  model: string;
}

export interface VectorizationOptions {
  forceRefresh?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export class ResumeVectorizationService {
  private readonly embeddingModel = 'text-embedding-3-small';
  private readonly costPerToken = 0.00002; // $0.02 per 1M tokens for text-embedding-3-small
  private readonly changeThresholds = {
    minorChanges: ['summary'],
    majorChanges: ['skills', 'experience', 'education'],
  };

  /**
   * Vectorize a resume profile
   */
  async vectorizeProfile(
    userId: string,
    profileId: string,
    options: VectorizationOptions = {}
  ): Promise<Result<ResumeVector, string>> {
    try {
      logger.info({
        msg: 'Starting resume vectorization',
        userId,
        profileId,
        options,
      });

      // Get the extracted profile
      const profileResult = await getExtractedProfile(userId);
      if (!profileResult) {
        return err('not_found', 'No extracted profile found for user');
      }

      // Check if we need to re-vectorize
      if (!options.forceRefresh) {
        const existing = await resumeVectorRepo.getByProfileId(profileId);
        if (existing) {
          logger.info({
            msg: 'Vector already exists, skipping',
            profileId,
            version: existing.version,
          });
          const vector: ResumeVector = {
            ...existing,
            createdAt: new Date(existing.createdAt),
            updatedAt: new Date(existing.updatedAt),
          };
          return ok(vector);
        }
      }

      // Prepare content for vectorization
      const content = this.prepareContentForVectorization(profileResult);

      // Generate embeddings
      const embeddingResult = await this.generateEmbeddings(content);
      if (!embeddingResult.ok) {
        return err('embedding_failed', embeddingResult.error.message);
      }

      const { embeddings, cost } = embeddingResult.value;

      // Create vector record
      const vector: ResumeVector = {
        userId,
        profileId,
        content,
        embeddings,
        dimensions: embeddings.length,
        model: this.embeddingModel,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Store the vector
      const storeResult = await resumeVectorRepo.upsert(vector);
      if (!storeResult.ok) {
        return err(
          'storage_failed',
          `Failed to store vector: ${storeResult.error.message}`
        );
      }

      logger.info({
        msg: 'Resume vectorization completed',
        userId,
        profileId,
        dimensions: vector.dimensions,
        costCents: cost.costCents,
        tokensUsed: cost.tokensUsed,
      });

      return ok(vector);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Resume vectorization failed',
        userId,
        profileId,
        error: message,
      });
      return err('vectorization_error', `Vectorization failed: ${message}`);
    }
  }

  /**
   * Generate embeddings using OpenAI API
   */
  private async generateEmbeddings(
    content: string
  ): Promise<
    Result<{ embeddings: number[]; cost: VectorizationCost }, string>
  > {
    try {
      const openai = await getOpenAI();
      if (!openai) {
        return err('client_error', 'OpenAI client not configured');
      }

      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: content,
        encoding_format: 'float',
      });

      const embeddings = response.data[0]?.embedding;
      if (!embeddings || !Array.isArray(embeddings)) {
        return err(
          'invalid_response',
          'Invalid embedding response from OpenAI'
        );
      }

      // Calculate cost
      const tokensUsed = response.usage?.total_tokens || 0;
      const costCents = Math.ceil(tokensUsed * this.costPerToken * 100);

      const cost: VectorizationCost = {
        tokensUsed,
        costCents,
        model: this.embeddingModel,
      };

      return ok({ embeddings, cost });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'OpenAI embedding generation failed',
        error: message,
      });
      return err('embedding_error', `Embedding generation failed: ${message}`);
    }
  }

  /**
   * Prepare profile content for vectorization
   */
  private prepareContentForVectorization(profile: ExtractedProfile): string {
    const sections: string[] = [];

    // Add summary
    if (profile.summary?.trim()) {
      sections.push(`Summary: ${profile.summary.trim()}`);
    }

    // Add skills
    if (profile.skills && profile.skills.length > 0) {
      const skillNames = profile.skills.map(skill => skill.name).join(', ');
      sections.push(`Skills: ${skillNames}`);
    }

    // Add experience
    if (profile.experience && profile.experience.length > 0) {
      const experienceText = profile.experience
        .map(exp => {
          const parts = [exp.company, exp.position];
          if (exp.description) parts.push(exp.description);
          return parts.join(' - ');
        })
        .join('\n');
      sections.push(`Experience: ${experienceText}`);
    }

    // Add education
    if (profile.education && profile.education.length > 0) {
      const educationText = profile.education
        .map(edu => {
          const parts = [edu.institution];
          if (edu.degree) parts.push(edu.degree);
          if (edu.fieldOfStudy) parts.push(edu.fieldOfStudy);
          return parts.join(' - ');
        })
        .join('\n');
      sections.push(`Education: ${educationText}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Determine if profile changes require re-vectorization
   */
  shouldRevectorize(changeEvent: ProfileChangeEvent): boolean {
    // Always re-vectorize on creation
    if (changeEvent.changeType === 'created') {
      return true;
    }

    // Delete vectors when profile is deleted
    if (changeEvent.changeType === 'deleted') {
      return true;
    }

    // Check significance of changes
    if (changeEvent.significance === 'major') {
      return true;
    }

    // Check if any major fields were changed
    const majorFieldsChanged = changeEvent.changedFields.some(field =>
      this.changeThresholds.majorChanges.some(majorField =>
        field.startsWith(majorField)
      )
    );

    return majorFieldsChanged;
  }

  /**
   * Search for similar profiles using vector similarity
   */
  async searchSimilarProfiles(
    queryVector: number[],
    limit = 10,
    excludeUserId?: string
  ): Promise<Result<Array<{ userId: string; score: number }>, string>> {
    try {
      const results = await resumeVectorRepo.vectorSearch({
        vector: queryVector,
        limit,
        filter: excludeUserId ? { userId: { $ne: excludeUserId } } : undefined,
      });

      return ok(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Vector search failed',
        error: message,
      });
      return err('search_error', `Vector search failed: ${message}`);
    }
  }

  /**
   * Get vector for a profile
   */
  async getProfileVector(
    profileId: string
  ): Promise<Result<ResumeVector | null, string>> {
    try {
      const doc = await resumeVectorRepo.getByProfileId(profileId);
      if (!doc) return ok(null);

      const vector: ResumeVector = {
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
      };
      return ok(vector);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err('get_error', `Failed to get vector: ${message}`);
    }
  }

  /**
   * Delete vector for a profile
   */
  async deleteProfileVector(profileId: string): Promise<Result<void, string>> {
    try {
      await resumeVectorRepo.deleteByProfileId(profileId);
      logger.info({ msg: 'Profile vector deleted', profileId });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Failed to delete profile vector',
        profileId,
        error: message,
      });
      return err('delete_error', `Failed to delete vector: ${message}`);
    }
  }

  /**
   * Get vectorization statistics
   */
  async getVectorizationStats(): Promise<
    Result<
      {
        totalVectors: number;
        averageDimensions: number;
        latestModel: string;
        oldestVector: Date | null;
        newestVector: Date | null;
      },
      string
    >
  > {
    try {
      const stats = await resumeVectorRepo.getStats();
      return ok(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err('stats_error', `Failed to get stats: ${message}`);
    }
  }
}

export const resumeVectorizationService = new ResumeVectorizationService();

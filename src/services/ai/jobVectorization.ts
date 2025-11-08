/**
 * Job Vectorization Service
 *
 * Generates semantic embeddings for job postings using OpenAI's embedding API
 * and stores them in MongoDB for fast vector search capabilities.
 *
 * Similar to resumeVectorization.ts but for job descriptions.
 */

import { getOpenAI } from '../../ai/openai/client';
import { logger } from '../../monitoring/logger';
import { ok, err, type Result } from '../../shared/result';
import type { Job } from '../../shared/types/job';
import { jobVectorRepo } from '../../data-access/repositories/jobVectorRepo';
import { jobRepo } from '../../data-access/repositories/jobRepo';

export interface JobVector {
  _id: string;
  jobId: string; // Reference to jobs._id
  embedding: number[]; // 1536-dimensional vector
  version: number; // Track embedding model version
  metadata: {
    title: string;
    company: string;
    location?: string;
    skills: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorizationCost {
  tokensUsed: number;
  costCents: number;
  model: string;
}

export interface VectorizationOptions {
  forceRefresh?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export class JobVectorizationService {
  private readonly embeddingModel = 'text-embedding-3-small';
  private readonly embeddingVersion = 1; // Increment when changing model or content preparation
  private readonly costPerToken = 0.00002; // $0.02 per 1M tokens for text-embedding-3-small

  /**
   * Vectorize a job posting
   */
  async vectorizeJob(
    jobId: string,
    options: VectorizationOptions = {}
  ): Promise<Result<JobVector, string>> {
    try {
      logger.info({
        msg: 'Starting job vectorization',
        jobId,
        options,
      });

      // Get the job
      const job = await jobRepo.findById(jobId);
      if (!job) {
        return err('not_found', 'Job not found');
      }

      // Check if we need to re-vectorize
      if (!options.forceRefresh) {
        const existing = await jobVectorRepo.getByJobId(jobId);
        if (existing && existing.version === this.embeddingVersion) {
          logger.info({
            msg: 'Job vector already exists with current version, skipping',
            jobId,
            version: existing.version,
          });
          return ok(existing);
        }
      }

      // Prepare content for vectorization
      const content = this.prepareJobContent(job);

      // Generate embeddings
      const embeddingResult = await this.generateEmbedding(content);

      if (!embeddingResult.ok) {
        return err(
          'embedding_error',
          `Failed to generate embedding: ${embeddingResult.error.message}`
        );
      }

      // Calculate cost
      const tokenCount = Math.ceil(content.length / 4); // Rough estimate: 1 token ≈ 4 chars
      const cost: VectorizationCost = {
        tokensUsed: tokenCount,
        costCents: tokenCount * this.costPerToken * 100,
        model: this.embeddingModel,
      };

      // Store vector
      const vector: Omit<JobVector, '_id'> = {
        jobId,
        embedding: embeddingResult.value,
        version: this.embeddingVersion,
        metadata: {
          title: job.title,
          company: job.company,
          location: job.location,
          skills: job.skills,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedVector = await jobVectorRepo.create(vector);

      logger.info({
        msg: 'Job vectorization completed',
        jobId,
        vectorId: savedVector._id,
        tokensUsed: cost.tokensUsed,
        costCents: cost.costCents,
      });

      return ok(savedVector);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Job vectorization failed',
        jobId,
        error: message,
      });
      return err('vectorization_error', `Vectorization failed: ${message}`);
    }
  }

  /**
   * Prepare job text for vectorization
   * Combine: title, description, requirements, skills, location, experience level
   */
  private prepareJobContent(job: Job): string {
    const sections: string[] = [];

    sections.push(`Job Title: ${job.title}`);
    sections.push(`Company: ${job.company}`);

    if (job.description) {
      sections.push(`Description: ${job.description}`);
    }

    if (job.requirements) {
      sections.push(`Requirements: ${job.requirements}`);
    }

    if (job.skills.length > 0) {
      sections.push(`Required Skills: ${job.skills.join(', ')}`);
    }

    if (job.location) {
      sections.push(`Location: ${job.location}`);
    }

    if (job.experienceLevel) {
      sections.push(`Experience Level: ${job.experienceLevel}`);
    }

    if (job.employmentType) {
      sections.push(`Employment Type: ${job.employmentType}`);
    }

    if (job.department) {
      sections.push(`Department: ${job.department}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(
    content: string
  ): Promise<Result<number[], string>> {
    try {
      const openai = await getOpenAI();

      logger.debug({
        msg: 'Calling OpenAI embeddings API',
        model: this.embeddingModel,
        contentLength: content.length,
      });

      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: content,
      });

      if (!response.data || response.data.length === 0) {
        return err(
          'empty_response',
          'OpenAI returned empty embedding response'
        );
      }

      const embedding = response.data[0].embedding;

      if (!embedding || embedding.length !== 1536) {
        return err(
          'invalid_embedding',
          `Expected 1536-dimensional vector, got ${embedding?.length || 0}`
        );
      }

      logger.debug({
        msg: 'OpenAI embedding generation successful',
        dimensions: embedding.length,
        tokensUsed: response.usage?.total_tokens || 0,
      });

      return ok(embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'OpenAI embedding generation failed',
        error: message,
      });
      return err('openai_error', `OpenAI API error: ${message}`);
    }
  }

  /**
   * Batch vectorize multiple jobs (for initial setup or sync)
   * Processes in batches to avoid rate limits
   */
  async batchVectorizeJobs(
    jobIds: string[],
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<
    Result<{ successful: number; failed: number; errors: string[] }, string>
  > {
    const batchSize = options.batchSize || 10;
    const delayMs = options.delayMs || 1000;

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    logger.info({
      msg: 'Starting batch job vectorization',
      totalJobs: jobIds.length,
      batchSize,
      delayMs,
    });

    for (let i = 0; i < jobIds.length; i += batchSize) {
      const batch = jobIds.slice(i, i + batchSize);

      logger.info({
        msg: 'Processing batch',
        batchNumber: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(jobIds.length / batchSize),
        jobsInBatch: batch.length,
      });

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(jobId => this.vectorizeJob(jobId))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successful++;
        } else {
          failed++;
          const jobId = batch[index];
          const error =
            result.status === 'rejected'
              ? result.reason
              : !result.value.ok
                ? result.value.error.message
                : 'Unknown error';
          errors.push(`${jobId}: ${error}`);
          logger.error({
            msg: 'Job vectorization failed in batch',
            jobId,
            error,
          });
        }
      });

      // Delay between batches to respect rate limits
      if (i + batchSize < jobIds.length) {
        logger.debug({
          msg: 'Delaying before next batch',
          delayMs,
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.info({
      msg: 'Batch vectorization complete',
      totalJobs: jobIds.length,
      successful,
      failed,
    });

    return ok({ successful, failed, errors });
  }

  /**
   * Get vectorization statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    currentVersion: number;
    oldVersionCount: number;
  }> {
    const stats = await jobVectorRepo.getStats();
    return {
      ...stats,
      currentVersion: this.embeddingVersion,
    };
  }
}

export const jobVectorizationService = new JobVectorizationService();

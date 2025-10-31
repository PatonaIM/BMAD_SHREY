/**
 * In-Memory Match Score Cache
 *
 * Caches job-candidate match scores to avoid expensive recalculations.
 * Cache entries expire after 24 hours and can be invalidated on profile/job updates.
 */

import { logger } from '../../monitoring/logger';
import type { JobCandidateMatch } from '../../shared/types/matching';

interface CacheEntry {
  match: JobCandidateMatch;
  expiresAt: number;
  createdAt: number;
}

export class MatchScoreCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours
  private hits = 0;
  private misses = 0;

  /**
   * Generate cache key for a user-job combination
   */
  private getCacheKey(userId: string, jobId: string): string {
    return `match:${userId}:${jobId}`;
  }

  /**
   * Get a cached match score
   */
  get(userId: string, jobId: string): JobCandidateMatch | null {
    const key = this.getCacheKey(userId, jobId);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      logger.debug({
        msg: 'Cache entry expired',
        userId,
        jobId,
      });
      return null;
    }

    this.hits++;
    logger.debug({
      msg: 'Cache hit',
      userId,
      jobId,
      age: Date.now() - entry.createdAt,
    });

    return entry.match;
  }

  /**
   * Store a match score in cache
   */
  set(
    userId: string,
    jobId: string,
    match: JobCandidateMatch,
    ttl?: number
  ): void {
    const key = this.getCacheKey(userId, jobId);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      match,
      expiresAt,
      createdAt: Date.now(),
    });

    logger.debug({
      msg: 'Cached match score',
      userId,
      jobId,
      score: match.score.overall,
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Get multiple cached matches (for batch operations)
   */
  getMany(
    userId: string,
    jobIds: string[]
  ): Map<string, JobCandidateMatch | null> {
    const results = new Map<string, JobCandidateMatch | null>();

    for (const jobId of jobIds) {
      results.set(jobId, this.get(userId, jobId));
    }

    return results;
  }

  /**
   * Store multiple matches (for batch operations)
   */
  setMany(userId: string, matches: JobCandidateMatch[], ttl?: number): void {
    for (const match of matches) {
      this.set(userId, match.jobId, match, ttl);
    }
  }

  /**
   * Invalidate all cache entries for a specific user
   * Call this when user profile is updated
   */
  invalidateUser(userId: string): number {
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(`match:${userId}:`)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    logger.info({
      msg: 'Invalidated user cache',
      userId,
      entriesDeleted: deleted,
    });

    return deleted;
  }

  /**
   * Invalidate all cache entries for a specific job
   * Call this when job details are updated
   */
  invalidateJob(jobId: string): number {
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${jobId}`)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    logger.info({
      msg: 'Invalidated job cache',
      jobId,
      entriesDeleted: deleted,
    });

    return deleted;
  }

  /**
   * Invalidate a specific user-job combination
   */
  invalidate(userId: string, jobId: string): boolean {
    const key = this.getCacheKey(userId, jobId);
    const deleted = this.cache.delete(key);

    if (deleted) {
      logger.debug({
        msg: 'Invalidated cache entry',
        userId,
        jobId,
      });
    }

    return deleted;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;

    logger.info({
      msg: 'Cleared match score cache',
      entriesDeleted: size,
    });
  }

  /**
   * Remove expired entries (garbage collection)
   */
  cleanup(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info({
        msg: 'Cleaned up expired cache entries',
        entriesDeleted: deleted,
      });
    }

    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      }
    }

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      expired,
    };
  }

  /**
   * Get the size of the cache
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance for the application
export const matchScoreCache = new MatchScoreCache();

// Run cleanup every hour
if (typeof global !== 'undefined') {
  setInterval(
    () => {
      matchScoreCache.cleanup();
    },
    60 * 60 * 1000
  ); // 1 hour
}

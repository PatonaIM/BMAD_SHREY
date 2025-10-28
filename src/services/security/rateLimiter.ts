// Simple in-memory rate limiter (non-distributed) suitable for dev/test.
// For production use Redis or Upstash and sliding window algorithm.
interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  limit: number; // max events
  windowMs: number; // window size
}

export function isRateLimited(key: string, cfg: RateLimitConfig): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  // prune timestamps outside window
  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < cfg.windowMs);
  if (bucket.timestamps.length >= cfg.limit) return true;
  bucket.timestamps.push(now);
  return false;
}

export function resetBucket(key: string): void {
  buckets.delete(key);
}

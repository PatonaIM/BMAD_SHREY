import { workableClient } from './workableClient';
import { jobRepo } from '../../data-access/repositories/jobRepo';
import type { Job } from '../../shared/types/job';
import { logger } from '../../monitoring/logger';

export interface SyncResultSummary {
  created: number;
  updated: number;
  unchanged: number;
  archived: number;
  errors: number;
  tookMs: number;
}

export async function syncWorkableJobs(
  retries = 2
): Promise<SyncResultSummary> {
  const start = performance.now();
  let apiJobs;
  try {
    apiJobs = await workableClient.listJobs();
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 500));
      return syncWorkableJobs(retries - 1);
    }
    throw err;
  }
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let archived = 0;
  let errors = 0;

  for (const wj of apiJobs) {
    try {
      const status: Job['status'] =
        wj.state === 'published' ? 'active' : 'archived';
      const locationParts = [
        wj.location?.city,
        wj.location?.region,
        wj.location?.country,
        wj.location?.remote ? 'Remote' : undefined,
      ].filter(Boolean);
      const location = locationParts.join(', ') || undefined;
      const employmentType = normalizeEmploymentType(wj.employment_type);
      const experienceLevel = normalizeExperience(wj.experience);
      const salary = wj.salary || undefined;
      const data = {
        workableId: wj.id,
        workableShortcode: wj.shortcode,
        lastSyncedAt: new Date(),
        title: wj.title,
        description: wj.description || '',
        requirements: wj.requirements,
        location,
        department: wj.department,
        employmentType: employmentType,
        experienceLevel: experienceLevel,
        salary: salary || undefined,
        company: 'Teamified',
        companyDescription: 'Teamified unified talent platform',
        status,
        postedAt: wj.published_at
          ? new Date(wj.published_at)
          : new Date(wj.created_at),
        closedAt: status === 'archived' ? new Date(wj.updated_at) : undefined,
        skills: [],
        embeddingVersion: 1,
      } as Omit<Job, '_id' | 'createdAt' | 'updatedAt'>;
      const { created: wasCreated, updatedFields } =
        await jobRepo.upsertByWorkableId(wj.id, data);
      if (wasCreated) created += 1;
      else if (updatedFields.length > 0) updated += 1;
      else unchanged += 1;
      if (status === 'archived') archived += 1;
    } catch (err) {
      errors += 1;
      logger.error({
        event: 'workable_sync_job_error',
        error: (err as Error).message,
      });
    }
  }
  const tookMs = Math.round(performance.now() - start);
  logger.info({
    event: 'workable_sync_complete',
    created,
    updated,
    unchanged,
    archived,
    errors,
    tookMs,
  });
  return { created, updated, unchanged, archived, errors, tookMs };
}

function normalizeEmploymentType(value?: string | null) {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v.includes('full')) return 'full-time';
  if (v.includes('part')) return 'part-time';
  if (v.includes('intern')) return 'internship';
  if (v.includes('contract')) return 'contract';
  if (v.includes('temp')) return 'temporary';
  return undefined;
}

function normalizeExperience(value?: string | null) {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v.includes('entry')) return 'entry';
  if (v.includes('mid')) return 'mid';
  if (v.includes('senior')) return 'senior';
  if (v.includes('lead')) return 'lead';
  if (v.includes('exec')) return 'executive';
  return undefined;
}

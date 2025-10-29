import { jobRepo } from '../../data-access/repositories/jobRepo';
import { workableClient } from './workableClient';
import type { Job } from '../../shared/types/job';
import { logger } from '../../monitoring/logger';

export interface BatchHydrationSummary {
  attempted: number;
  enriched: number;
  unchanged: number;
  errors: number;
  tookMs: number;
}

export async function batchHydrateJobs(
  limit = 25
): Promise<BatchHydrationSummary> {
  const start = performance.now();
  const candidates = await jobRepo.findNeedingHydration(limit);
  let enriched = 0;
  let unchanged = 0;
  let errors = 0;
  for (const job of candidates) {
    try {
      const detail = job.workableShortcode
        ? await workableClient.getJobDetails(job.workableShortcode)
        : null;
      if (!detail) {
        unchanged += 1;
        continue;
      }
      const updates: Partial<Job> = {};
      if (
        (!job.description || job.description.length < 60) &&
        detail.description
      ) {
        updates.description = sanitizeHtml(detail.description);
      }
      if (!job.requirements && detail.requirements) {
        updates.requirements = sanitizeHtml(detail.requirements);
      }
      if (
        (!job.skills || job.skills.length === 0) &&
        (detail.description || detail.requirements)
      ) {
        const combined = `${detail.description || ''}\n${detail.requirements || ''}`;
        const skills = extractSkills(combined);
        if (skills.length) updates.skills = skills;
      }
      if (Object.keys(updates).length === 0) {
        unchanged += 1;
        continue;
      }
      updates.hydratedAt = new Date();
      await jobRepo.update(job.workableId, updates);
      enriched += 1;
    } catch (err) {
      errors += 1;
      logger.error({
        event: 'job_hydration_error',
        workableId: job.workableId,
        error: (err as Error).message,
      });
    }
  }
  const tookMs = Math.round(performance.now() - start);
  const summary: BatchHydrationSummary = {
    attempted: candidates.length,
    enriched,
    unchanged,
    errors,
    tookMs,
  };
  logger.info({ event: 'job_hydration_complete', ...summary });
  return summary;
}

function sanitizeHtml(raw: string): string {
  let text = raw
    .replace(/<\/(script|style)>/gi, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return text.replace(/\s+/g, ' ').trim();
}
const SKILL_DICTIONARY = [
  'react',
  'typescript',
  'javascript',
  'node',
  'node.js',
  'mongodb',
  'sql',
  'python',
  'docker',
  'kubernetes',
  'aws',
  'gcp',
  'azure',
  'graphql',
  'css',
  'html',
  'testing',
  'jest',
  'vitest',
  'ci',
  'cd',
];
function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_DICTIONARY) {
    const pattern = new RegExp(
      `\\b${skill.replace(/[.+]/g, x => `\\${x}`)}\\b`,
      'i'
    );
    if (pattern.test(lower)) {
      const normalized = skill === 'node.js' ? 'node' : skill;
      found.add(normalized);
    }
  }
  return Array.from(found).sort();
}

import React from 'react';
import { notFound } from 'next/navigation';
import { jobRepo } from '../../../data-access/repositories/jobRepo';
import { applicationRepo } from '../../../data-access/repositories/applicationRepo';
import type { Job } from '../../../shared/types/job';
import { buildJobsJsonLd } from '../../../seo/jobJsonLd';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import NextLink from 'next/link';
import { workableClient } from '../../../services/workable/workableClient';
import { logger } from '../../../monitoring/logger';
import { ApplyButton } from '../../../components/ApplyButton';

// Next.js v15 supplies params as Promise
type ParamsPromise = Promise<{ id: string }>;

async function fetchJob(id: string): Promise<Job | null> {
  const byWorkable = await jobRepo.findByWorkableId(id);
  if (byWorkable) {
    logger.info({
      event: 'job_fetch',
      strategy: 'workableId',
      id,
      workableId: byWorkable.workableId,
      descriptionLen: byWorkable.description?.length || 0,
    });
    return byWorkable as Job;
  }
  const fallback = await jobRepo.findById(id);
  logger.info({
    event: 'job_fetch',
    strategy: 'mongoId',
    id,
    found: Boolean(fallback),
    descriptionLen: fallback?.description?.length || 0,
  });
  return fallback;
}

async function hydrateJob(job: Job): Promise<Job> {
  if (!job.workableShortcode) return job;
  const needsDescription = !job.description || job.description.length < 60;
  const needsRequirements = !job.requirements;
  const needsSkills = !job.skills || job.skills.length === 0;
  if (!needsDescription && !needsRequirements && !needsSkills) return job;
  logger.info({
    event: 'job_hydrate_start',
    workableId: job.workableId,
    shortcode: job.workableShortcode,
    needsDescription,
    needsRequirements,
    needsSkills,
    currentDescriptionLen: job.description?.length || 0,
  });
  try {
    const detail = await workableClient.getJobDetails(job.workableShortcode);
    if (!detail) {
      logger.warn({
        event: 'job_hydrate_detail_missing',
        workableId: job.workableId,
        shortcode: job.workableShortcode,
      });
      return job;
    }
    const updates: Partial<Job> = {};
    if (needsDescription && detail.description) {
      const sanitized = sanitizeHtml(detail.description);
      if (sanitized.length > (job.description?.length || 0))
        updates.description = sanitized;
    }
    if (needsRequirements && detail.requirements) {
      updates.requirements = sanitizeHtml(detail.requirements);
    }
    if (needsSkills && (detail.description || detail.requirements)) {
      const combined = `${detail.description || ''}\n${detail.requirements || ''}`;
      const skills = extractSkills(combined);
      if (skills.length) updates.skills = skills;
    }
    if (Object.keys(updates).length > 0) {
      updates.hydratedAt = new Date();
      logger.info({
        event: 'job_hydrate_updates',
        workableId: job.workableId,
        updateKeys: Object.keys(updates),
        newDescriptionLen: updates.description?.length || null,
      });
      const updated = await jobRepo.update(job.workableId, updates);
      return updated || { ...job, ...updates };
    }
    logger.info({
      event: 'job_hydrate_no_changes',
      workableId: job.workableId,
    });
  } catch (err) {
    logger.error({
      event: 'job_hydrate_error',
      workableId: job.workableId,
      error: (err as Error).message,
    });
  }
  return job;
}

function sanitizeHtml(raw: string): string {
  // Remove script/style tags
  let text = raw
    .replace(/<\/(script|style)>/gi, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, '');
  // Strip all tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode basic entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  // Collapse whitespace
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
      // normalize node.js to node
      const normalized = skill === 'node.js' ? 'node' : skill;
      found.add(normalized);
    }
  }
  return Array.from(found).sort();
}

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const { id } = await params; // Await per Next.js dynamic API requirement
  const job = await fetchJob(id);
  if (!job) {
    return {
      title: 'Job Not Found | Teamified',
      description: 'The requested job does not exist or may have been closed.',
    };
  }
  const title = `${job.title} at ${job.company} | Teamified`;
  const description = job.description.slice(0, 160);
  const urlBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${urlBase}/jobs/${id}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Teamified',
    },
    alternates: { canonical: url },
  };
}

export default async function JobDetailsPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { id } = await params;
  let job = await fetchJob(id);
  if (!job) return notFound();
  job = await hydrateJob(job);
  const session = await getServerSession(authOptions);
  // Get application count for this job
  const applications = await applicationRepo.listForJob(job._id);
  const applicationCount = applications.length;
  const jsonLd = buildJobsJsonLd([job]);
  // Removed unused applyHref variable (navigation handled by ApplyButton component)

  // Runtime fetch full detail (keeps HTML) for richer rendering (description/requirements/benefits)
  let fullDetail: Awaited<
    ReturnType<typeof workableClient.getJobDetails>
  > | null = null;
  if (job.workableShortcode) {
    try {
      fullDetail = await workableClient.getJobDetails(job.workableShortcode);
    } catch {
      fullDetail = null; // Non-blocking
    }
  }

  const descriptionHtml = fullDetail?.description || job.description;
  const requirementsHtml = fullDetail?.requirements || job.requirements || '';
  const safeDescription = sanitizeHtmlAllowBasic(descriptionHtml);
  const safeRequirements = requirementsHtml
    ? sanitizeHtmlAllowBasic(requirementsHtml)
    : '';
  const benefits = extractBenefits(descriptionHtml + '\n' + requirementsHtml);
  logger.info({
    event: 'job_render',
    workableId: job.workableId,
    shortcode: job.workableShortcode,
    storedDescriptionLen: job.description?.length || 0,
    fullDetailDescriptionLen: fullDetail?.description?.length || null,
    renderedDescriptionLen: safeDescription.length,
    hasRequirements: Boolean(requirementsHtml),
    benefitsCount: benefits.length,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <nav aria-label="Breadcrumb" className="text-sm mb-4">
          <ol className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <li>
              <NextLink href="/" className="hover:underline">
                Jobs
              </NextLink>
            </li>
            <li className="select-none">/</li>
            <li
              aria-current="page"
              className="font-medium text-neutral-900 dark:text-neutral-200 truncate max-w-[200px]"
            >
              {job.title}
            </li>
          </ol>
        </nav>
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {job.title}
          </h1>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {job.company}
            {job.location && <> • {job.location}</>}
            {job.employmentType && <> • {job.employmentType}</>}
            {job.experienceLevel && <> • {job.experienceLevel} level</>}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            {applicationCount}{' '}
            {applicationCount === 1 ? 'application' : 'applications'} submitted
          </p>
        </header>
        {job.salary?.min && (
          <p className="text-xs mb-4 text-neutral-600 dark:text-neutral-300">
            Compensation: {job.salary.min}
            {job.salary.max && ` - ${job.salary.max}`}{' '}
            {job.salary.currency || 'USD'}
          </p>
        )}
        <section
          aria-labelledby="description-heading"
          className="card p-5 mb-6"
        >
          <h2 id="description-heading" className="text-xl font-semibold mb-3">
            Description
          </h2>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />
        </section>
        {safeRequirements && (
          <section
            aria-labelledby="requirements-heading"
            className="card p-5 mb-6"
          >
            <h2
              id="requirements-heading"
              className="text-xl font-semibold mb-3"
            >
              Requirements
            </h2>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: safeRequirements }}
            />
          </section>
        )}
        {benefits.length > 0 && (
          <section aria-labelledby="benefits-heading" className="card p-5 mb-6">
            <h2 id="benefits-heading" className="text-xl font-semibold mb-3">
              Benefits &amp; Perks
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              {benefits.map(b => (
                <li key={b} className="text-sm">
                  {b}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="skills-heading" className="card p-5 mb-8">
          <h2 id="skills-heading" className="text-xl font-semibold mb-3">
            Skills
          </h2>
          {job.skills.length ? (
            <div className="flex flex-wrap gap-2">
              {job.skills.map(s => (
                <span key={s} className="badge">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              No specific skills listed.
            </p>
          )}
        </section>
        <div className="flex flex-col sm:flex-row gap-3">
          <ApplyButton
            jobId={job.workableId || job._id}
            label={session ? 'Apply Now' : 'Login to Apply'}
          />
          <NextLink href="/" className="btn-outline px-5 py-2 text-sm">
            Back to Jobs
          </NextLink>
        </div>
        <hr className="my-8 border-neutral-200 dark:border-neutral-700" />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Last hydrated:{' '}
          {job.hydratedAt ? new Date(job.hydratedAt).toLocaleString() : 'n/a'}
        </p>
      </main>
    </>
  );
}

// Sanitize while allowing basic formatting tags
function sanitizeHtmlAllowBasic(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(
    /<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi,
    ''
  );
  cleaned = cleaned
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
  const allowed = [
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'b',
    'i',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ];
  cleaned = cleaned.replace(/<([^>]+)>/g, (match, tagContent) => {
    const tagName = tagContent.split(/\s+/)[0].toLowerCase();
    const isClosing = tagName.startsWith('/');
    const baseName = isClosing ? tagName.slice(1) : tagName;
    if (allowed.includes(baseName)) return `<${tagContent}>`;
    if (baseName === 'div') return isClosing ? '</p>' : '<p>';
    return '';
  });
  return cleaned.trim();
}

function extractBenefits(html: string): string[] {
  if (!html) return [];
  const text = html
    .replace(/<li[^>]*>/gi, '\n• ') // isolate list items
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
  const lines = text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);
  const result: string[] = [];
  let inBenefits = false;
  for (const line of lines) {
    if (/^(benefits|perks|what we offer|what you'll get)/i.test(line)) {
      inBenefits = true;
      continue;
    }
    if (inBenefits) {
      if (
        /^(description|requirements|responsibilities|about us|company)/i.test(
          line
        )
      )
        break;
      if (line.startsWith('•')) {
        const item = line.replace(/^•\s?/, '').trim();
        if (item.length > 2) result.push(item);
      } else if (result.length && line.length > 5 && !/^[-*]/.test(line)) {
        result[result.length - 1] += ' ' + line;
      }
    }
  }
  return Array.from(new Set(result));
}

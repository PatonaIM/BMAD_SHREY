import React from 'react';
import { notFound } from 'next/navigation';
import { jobRepo } from '../../../data-access/repositories/jobRepo';
import type { Job } from '../../../shared/types/job';
import { buildJobsJsonLd } from '../../../seo/jobJsonLd';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import NextLink from 'next/link';
import { workableClient } from '../../../services/workable/workableClient';
import {
  Container,
  Box,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  Stack,
  Button,
  Divider,
  Paper,
} from '@mui/material';

type RawParams = { id: string };
interface PageProps {
  params: RawParams | Promise<RawParams>;
}

async function fetchJob(id: string): Promise<Job | null> {
  // Try workableId first then fallback to Mongo _id
  const byWorkable = await jobRepo.findByWorkableId(id);
  if (byWorkable) return byWorkable as Job;
  return jobRepo.findById(id);
}

async function hydrateJob(job: Job): Promise<Job> {
  if (!job.workableShortcode) return job;
  const needsDescription = !job.description || job.description.length < 60;
  const needsRequirements = !job.requirements;
  const needsSkills = !job.skills || job.skills.length === 0;
  if (!needsDescription && !needsRequirements && !needsSkills) return job;
  try {
    const detail = await workableClient.getJobDetails(job.workableShortcode);
    if (!detail) return job;
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
      const updated = await jobRepo.update(job.workableId, updates);
      return updated || { ...job, ...updates };
    }
  } catch {
    // Silent failure
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
}: PageProps): Promise<Metadata> {
  const resolved = await params; // Await per Next.js dynamic API requirement
  const job = await fetchJob(resolved.id);
  if (!job) {
    return {
      title: 'Job Not Found | Teamified',
      description: 'The requested job does not exist or may have been closed.',
    };
  }
  const title = `${job.title} at ${job.company} | Teamified`;
  const description = job.description.slice(0, 160);
  const urlBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${urlBase}/jobs/${resolved.id}`;
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

export default async function JobDetailsPage({ params }: PageProps) {
  const resolved = await params;
  let job = await fetchJob(resolved.id);
  if (!job) return notFound();
  job = await hydrateJob(job);
  const session = await getServerSession(authOptions);
  const jsonLd = buildJobsJsonLd([job]);
  const applyHref = session
    ? `/jobs/${job.workableId || job._id}/apply`
    : `/login?redirect=/jobs/${job.workableId || job._id}/apply`;

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

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container maxWidth="md" sx={{ py: 4 }} component="main">
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink
            component={NextLink}
            href="/"
            underline="hover"
            color="inherit"
          >
            Jobs
          </MuiLink>
          <Typography color="text.primary">{job.title}</Typography>
        </Breadcrumbs>
        <Box component="header" sx={{ mb: 3 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {job.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {job.company}
            {job.location && <> • {job.location}</>}
            {job.employmentType && <> • {job.employmentType}</>}
            {job.experienceLevel && <> • {job.experienceLevel} level</>}
          </Typography>
        </Box>
        {job.salary?.min && (
          <Typography variant="body2" sx={{ mb: 3 }}>
            Compensation: {job.salary.min}
            {job.salary.max && ` - ${job.salary.max}`}{' '}
            {job.salary.currency || 'USD'}
          </Typography>
        )}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Description
          </Typography>
          <Typography
            variant="body1"
            sx={{ lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />
        </Paper>
        {safeRequirements && (
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Requirements
            </Typography>
            <Typography
              variant="body1"
              sx={{ lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: safeRequirements }}
            />
          </Paper>
        )}
        {benefits.length > 0 && (
          <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Benefits & Perks
            </Typography>
            <Stack
              component="ul"
              spacing={1}
              sx={{ m: 0, p: 0, listStyle: 'none' }}
            >
              {benefits.map(b => (
                <Box component="li" key={b}>
                  <Typography variant="body2">• {b}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Skills
          </Typography>
          {job.skills.length ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {job.skills.map(s => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  color="default"
                  variant="outlined"
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No specific skills listed.
            </Typography>
          )}
        </Paper>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            component={NextLink}
            href={applyHref}
            variant="contained"
            color="primary"
            size="large"
            aria-label={`Apply to ${job.title}`}
          >
            {session ? 'Apply Now' : 'Login to Apply'}
          </Button>
          <Button
            component={NextLink}
            href="/"
            variant="outlined"
            color="primary"
            size="large"
          >
            Back to Jobs
          </Button>
        </Stack>
        <Divider sx={{ mt: 6 }} />
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Last hydrated:{' '}
            {job.hydratedAt ? new Date(job.hydratedAt).toLocaleString() : 'n/a'}
          </Typography>
        </Box>
      </Container>
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

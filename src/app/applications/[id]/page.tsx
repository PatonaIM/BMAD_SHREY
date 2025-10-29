import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '../../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../../data-access/repositories/jobRepo';
import { Box, Typography, Paper, Stack, Chip } from '@mui/material';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string })
    : undefined;
  if (!userSession?.id) redirect(`/login?redirect=/applications/${id}`);
  const app = await applicationRepo.findById(id);
  if (!app) return notFound();
  if (app.userId !== userSession.id) return notFound();
  const job = await jobRepo.findById(app.jobId);
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 2 }}>
        Application Details
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h2" sx={{ fontSize: '1.25rem', mb: 1 }}>
          {job?.title || 'Unknown Role'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {job?.company || 'Unknown Company'} • Applied{' '}
          {app.appliedAt.toLocaleDateString()}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={app.status} size="small" />
          {typeof app.matchScore === 'number' && (
            <Chip label={`Match ${app.matchScore}`} size="small" />
          )}
        </Stack>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Timeline
        </Typography>
        <Stack spacing={1}>
          {app.timeline.map((e, i) => (
            <Typography key={i} variant="body2">
              {e.timestamp.toLocaleString()} – {e.status} ({e.actorType}
              {e.actorId ? `:${e.actorId}` : ''}) {e.note ? `– ${e.note}` : ''}
            </Typography>
          ))}
        </Stack>
      </Paper>
      {job?.description && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h3" sx={{ fontSize: '1.2rem', mb: 1 }}>
            Job Snapshot
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {job.description.slice(0, 600)}
            {job.description.length > 600 ? '…' : ''}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

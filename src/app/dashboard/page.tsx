import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { redirect } from 'next/navigation';
import { applicationRepo } from '../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../data-access/repositories/jobRepo';
import { Box, Typography, Paper, Chip, Stack, Button } from '@mui/material';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string })
    : undefined;
  if (!userSession?.id) {
    redirect(`/login?redirect=/dashboard`);
  }
  const userId = userSession.id as string;
  const apps = await applicationRepo.findByUser(userId, 100);
  const enriched = await applicationRepo.enrichListItems(apps);
  const latestJobs = (await jobRepo.search({ page: 1, limit: 5 })).jobs;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box component="header" aria-labelledby="dashboard-heading">
        <Typography
          id="dashboard-heading"
          variant="h1"
          sx={{ fontSize: '2rem', mb: 1 }}
        >
          Your Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your applications and explore new opportunities.
        </Typography>
      </Box>

      <Box component="section" aria-labelledby="applications-heading">
        <Typography
          id="applications-heading"
          variant="h2"
          sx={{ fontSize: '1.5rem', mb: 2 }}
        >
          Applications
        </Typography>
        {enriched.length === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              You haven't applied to any jobs yet. Browse roles and apply to get
              started.
            </Typography>
            <Button
              component={Link}
              href="/"
              sx={{ mt: 2 }}
              variant="contained"
            >
              Browse Roles
            </Button>
          </Paper>
        )}
        <Stack spacing={2}>
          {enriched.map(app => (
            <Paper key={app._id} sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {app.jobTitle}{' '}
                <Typography component="span" variant="caption">
                  @ {app.company}
                </Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Applied {app.appliedAt.toLocaleDateString()} • Status:{' '}
                {app.status}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={app.status}
                  size="small"
                  color={app.status === 'submitted' ? 'primary' : 'default'}
                />
                {typeof app.matchScore === 'number' && (
                  <Chip label={`Match ${app.matchScore}`} size="small" />
                )}
              </Stack>
              {app.lastEventStatus && (
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  Last update: {app.lastEventStatus} on{' '}
                  {app.lastEventAt?.toLocaleDateString()}
                </Typography>
              )}
              <Button
                component={Link}
                href={`/applications/${app._id}`}
                size="small"
                variant="outlined"
              >
                View Details
              </Button>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Box component="section" aria-labelledby="latest-jobs-heading">
        <Typography
          id="latest-jobs-heading"
          variant="h2"
          sx={{ fontSize: '1.5rem', mb: 2 }}
        >
          Latest Jobs
        </Typography>
        <Stack spacing={2}>
          {latestJobs.map(job => (
            <Paper key={job._id} sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {job.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {job.company}
                {job.location ? ` • ${job.location}` : ''}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {job.skills.slice(0, 3).map(s => (
                  <Chip key={s} label={s} size="small" />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  href={`/jobs/${job.workableId || job._id}`}
                  size="small"
                  variant="outlined"
                >
                  Details
                </Button>
                <Button
                  component={Link}
                  href={`/jobs/${job.workableId || job._id}/apply`}
                  size="small"
                  variant="contained"
                >
                  Apply
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

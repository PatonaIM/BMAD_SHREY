import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound } from 'next/navigation';
import { Box, Typography, Button, Alert } from '@mui/material';
import Link from 'next/link';
import { jobRepo } from '../../../data-access/repositories/jobRepo';

export default async function AdminJobsPage() {
  const session = await getServerSession(authOptions);
  const roles: string[] | undefined = Array.isArray(
    (session?.user as unknown as { roles?: unknown })?.roles
  )
    ? (session?.user as unknown as { roles?: string[] })?.roles
    : undefined;
  if (!roles || !roles.includes('ADMIN')) return notFound();
  const lastSync = await jobRepo.getLastSyncTime();
  return (
    <Box sx={{ px: 4, py: 6, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h1" sx={{ fontSize: '2rem', mb: 3 }}>
        Job Administration
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Last sync: {lastSync ? lastSync.toISOString() : 'Never'}
      </Alert>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
        <form action="/api/workable/sync" method="post">
          <Button type="submit" variant="contained" color="primary">
            Sync Workable Jobs
          </Button>
        </form>
        <form action="/api/dev/seed-jobs" method="post">
          <Button type="submit" variant="outlined" color="secondary">
            Seed Sample Jobs (Dev)
          </Button>
        </form>
        <Button component={Link} href="/" variant="text">
          View Homepage
        </Button>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Ensure WORKABLE_SUBDOMAIN is just the subdomain (e.g. "teamified" not a
        full URL). Seed jobs are only available in non-production environments.
      </Typography>
    </Box>
  );
}

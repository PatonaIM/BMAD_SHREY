import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import Link from 'next/link';
import { Box, Typography, Button, TextField, Alert } from '@mui/material';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';

interface PageProps {
  params: { id: string };
}

export default async function ApplyPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login?redirect=/jobs/${params.id}/apply`);
  }
  const job =
    (await jobRepo.findByWorkableId(params.id)) ||
    (await jobRepo.findById(params.id));
  if (!job) return notFound();
  const userId = (session.user as { id?: string })?.id;
  if (!userId) {
    redirect(`/login?redirect=/jobs/${params.id}/apply`);
  }
  const existing = await applicationRepo.findByUserAndJob(userId, job._id);

  // Placeholder until application repository & workflow is implemented
  return (
    <Box component="main" sx={{ px: 4, py: 6, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h1" sx={{ fontSize: '2rem', mb: 2 }}>
        Apply to {job.title}
      </Typography>
      {existing ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          You already applied to this job. Application ID: {existing._id}
        </Alert>
      ) : (
        <>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Submit a simple application. Resume URL and cover letter are
            optional for MVP. Duplicate applications are prevented.
          </Typography>
          <Box
            component="form"
            action={`/jobs/${params.id}/apply`}
            method="post"
            encType="multipart/form-data"
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}
          >
            <TextField
              name="resumeUrl"
              label="Resume URL"
              placeholder="https://..."
              size="small"
              fullWidth
            />
            <TextField
              name="coverLetter"
              label="Cover Letter"
              placeholder="Optional cover letter"
              multiline
              minRows={4}
              fullWidth
            />
            <Button type="submit" variant="contained" color="primary">
              Submit Application
            </Button>
          </Box>
        </>
      )}
      <Button
        component={Link}
        href={`/jobs/${job.workableId || job._id}`}
        variant="outlined"
      >
        Back to Job
      </Button>
    </Box>
  );
}

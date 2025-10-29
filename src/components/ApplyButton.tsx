'use client';
import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
} from '@mui/material';
import Link from 'next/link';

interface ApplyButtonProps {
  jobId: string;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  redirectOnAuth?: boolean;
}

export function ApplyButton({
  jobId,
  variant = 'contained',
  size = 'small',
  label,
  redirectOnAuth = true,
}: ApplyButtonProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = React.useState(false);
  const loading = status === 'loading';

  const handleClick = () => {
    if (loading) return;
    if (!session) {
      setOpen(true);
    }
  };

  if (session) {
    return (
      <Button
        component={Link}
        href={`/jobs/${jobId}/apply`}
        variant={variant}
        size={size}
        color="primary"
        aria-label={`Apply to job ${jobId}`}
      >
        {label || 'Apply Now'}
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        color="primary"
        aria-label="Open login dialog to apply"
      >
        {label || 'Login to Apply'}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="apply-auth-title"
      >
        <DialogTitle id="apply-auth-title">Login Required</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You need an account to apply. Login or create a free account to
            continue.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              href={`/login${redirectOnAuth ? `?redirect=/jobs/${jobId}/apply` : ''}`}
              variant="contained"
              color="primary"
            >
              Login
            </Button>
            <Button
              component={Link}
              href="/register"
              variant="outlined"
              color="secondary"
            >
              Sign Up
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

'use client';
import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import Link from 'next/link';

export function Hero(): React.ReactElement {
  return (
    <Box
      component="section"
      aria-labelledby="hero-heading"
      sx={{
        py: { xs: 4, md: 8 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 3,
      }}
    >
      <Typography
        id="hero-heading"
        variant="h1"
        sx={{
          fontSize: { xs: '2.2rem', md: '3rem' },
          fontWeight: 700,
          lineHeight: 1.15,
        }}
      >
        Smarter Job Matching. Faster Progress.
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ maxWidth: 760, fontSize: '1.1rem', color: 'text.secondary' }}
      >
        Teamified connects talent to opportunity using AI-enhanced scoring and
        interview insights. Discover roles, apply in seconds, and track progress
        transparently.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          component={Link}
          href="#job-results-heading"
          variant="contained"
          color="primary"
          size="large"
          aria-label="Browse open roles"
        >
          Browse Roles
        </Button>
        <Button
          component={Link}
          href="/register"
          variant="outlined"
          color="secondary"
          size="large"
          aria-label="Create account"
        >
          Create Account
        </Button>
      </Stack>
    </Box>
  );
}

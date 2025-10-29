'use client';

import React from 'react';
import { Box, Container, Grid, Link, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';

export function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="primary" gutterBottom>
              Teamified
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-powered job application platform connecting talent with
              opportunity through intelligent matching and transparent feedback.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom>
              Company
            </Typography>
            <Link
              href="/about"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              About Us
            </Link>
            <Link
              href="/contact"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              Contact
            </Link>
            <Link
              href="/careers"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              Careers
            </Link>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom>
              Legal
            </Typography>
            <Link
              href="/privacy"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              Terms of Service
            </Link>
            <Box sx={{ mt: 2 }}>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener"
                sx={{ mr: 2 }}
              >
                <GitHubIcon />
              </Link>
              <Link
                href="https://linkedin.com"
                target="_blank"
                rel="noopener"
                sx={{ mr: 2 }}
              >
                <LinkedInIcon />
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener">
                <TwitterIcon />
              </Link>
            </Box>
          </Grid>
        </Grid>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 4 }}
        >
          © {currentYear} Teamified. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

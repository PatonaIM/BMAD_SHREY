'use client';
import React, { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
// GitHub icon handled inside SocialProviderButton component
import { SocialProviderButton } from '../../components/SocialProviderButton';

const errorMap: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password',
  AccessDenied: 'Access denied',
};

export default function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const params = useSearchParams();
  const authError = params.get('error');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    const res = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/',
      redirect: true,
    });
    // If redirect:true NextAuth handles navigation; errors appear via query string
    setLoading(false);
    if (res && res.error) {
      setFormError(errorMap[res.error] || 'Login failed');
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h4" fontWeight={600} textAlign="center">
            Welcome Back
          </Typography>
          {authError && !formError && (
            <Alert severity="error" variant="outlined">
              {errorMap[authError] || authError}
            </Alert>
          )}
          {formError && (
            <Alert severity="error" variant="outlined">
              {formError}
            </Alert>
          )}
          <OAuthButtons />
          <Divider>or use email</Divider>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
              <TextField
                label="Password"
                type="password"
                required
                fullWidth
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.2 }}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mt: 0.5 }}
              >
                <Button
                  variant="text"
                  size="small"
                  href="/register"
                  sx={{ textTransform: 'none' }}
                >
                  Need an account? Register
                </Button>
                <Button
                  variant="text"
                  size="small"
                  href="/password-reset"
                  sx={{ textTransform: 'none' }}
                >
                  Forgot password?
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}

type OAuthProviderMap = {
  google?: { id: string; name: string };
  github?: { id: string; name: string };
  credentials?: { id: string; name: string };
  [k: string]: { id: string; name: string } | undefined;
};

function OAuthButtons(): React.ReactElement | null {
  const [providers, setProviders] = useState<OAuthProviderMap | null>(null);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void getProviders()
      .then(p => {
        if (mounted && p) setProviders(p as OAuthProviderMap);
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('Failed to load providers', err);
      });
    return () => {
      mounted = false;
    };
  }, []);
  if (!providers) return null;
  const order = ['google', 'github'];
  const visible = order.filter(id => providers[id]);
  if (visible.length === 0) return null;
  return (
    <Stack spacing={1}>
      {visible.map(id => (
        <SocialProviderButton
          key={id}
          providerId={id}
          providerName={providers[id]!.name}
          loading={providerLoading === id}
          onClick={() => {
            setProviderLoading(id);
            void signIn(id, { callbackUrl: '/' });
          }}
        />
      ))}
    </Stack>
  );
}

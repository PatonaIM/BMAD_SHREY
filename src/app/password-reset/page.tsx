'use client';
import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import { trpc } from '../../services/trpc/client';

export default function PasswordResetPage(): React.ReactElement {
  // Placeholder implementation; real flow would email a token
  const [email, setEmail] = useState('');
  const requestMutation = trpc.auth.passwordResetRequest.useMutation();
  const performMutation = trpc.auth.passwordResetPerform.useMutation();
  const [token, setToken] = useState('');
  // Prefill token from query param if present
  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token');
    if (t) setToken(t);
  }, []);
  const [newPassword, setNewPassword] = useState('');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    requestMutation.reset();
    try {
      await requestMutation.mutateAsync({ email });
    } catch {
      // swallow, error state handled via mutation
    }
  }

  async function handlePerform(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    performMutation.reset();
    try {
      await performMutation.mutateAsync({ token, newPassword });
    } catch {
      // swallow
    }
  }
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={5} sx={{ p: 4, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h4" fontWeight={600} textAlign="center">
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your account email and we'll send a reset link if this feature
            is enabled.
          </Typography>
          {requestMutation.isSuccess ? (
            <Alert severity="success" variant="outlined">
              If the email exists, a link was generated (token logged
              server-side).
            </Alert>
          ) : (
            <Stack component="form" onSubmit={handleSubmit} spacing={2}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {requestMutation.isError && (
                <Alert severity="error" variant="outlined">
                  {requestMutation.error?.message || 'Failed'}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={!email || requestMutation.isLoading}
              >
                {requestMutation.isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Stack>
          )}
          <Divider>Use token</Divider>
          <Stack component="form" onSubmit={handlePerform} spacing={2}>
            <TextField
              label="Token"
              required
              fullWidth
              value={token}
              onChange={e => setToken(e.target.value)}
            />
            <TextField
              label="New Password"
              type="password"
              required
              fullWidth
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            {performMutation.isError && (
              <Alert severity="error" variant="outlined">
                {performMutation.error?.message || 'Failed'}
              </Alert>
            )}
            {performMutation.isSuccess && (
              <Alert severity="success" variant="outlined">
                Password updated. You can now log in.
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={!token || !newPassword || performMutation.isLoading}
            >
              {performMutation.isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Button href="/login" variant="text" sx={{ textTransform: 'none' }}>
              Back to login
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}

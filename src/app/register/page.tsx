'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  LinearProgress,
  Box,
  Tooltip,
} from '@mui/material';
import { trpc } from '../../services/trpc/client';

function scorePassword(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels: string[] = [
    'Too weak',
    'Weak',
    'Fair',
    'Strong',
    'Very strong',
  ];
  const label = labels[score] ?? 'Too weak';
  return { score, label };
}

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const registerMutation = trpc.auth.register.useMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const strength = useMemo(() => scorePassword(password), [password]);

  // Business-level error returned inside the Result (not thrown as TRPCError)
  const businessError =
    registerMutation.isSuccess &&
    registerMutation.data &&
    !registerMutation.data.ok
      ? registerMutation.data.error
      : null;

  const canSubmit =
    email.length > 3 && password.length >= 8 && !registerMutation.isLoading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    registerMutation.reset();
    try {
      const res = await registerMutation.mutateAsync({ email, password });
      if (res.ok) {
        router.push('/login?registered=1');
      }
    } catch {
      /* error handled via mutation state */
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h4" fontWeight={600} textAlign="center">
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Use a valid email and a strong password (min 8 chars).
          </Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={email}
                autoComplete="email"
                onChange={e => setEmail(e.target.value)}
              />
              <Tooltip
                title={`Password strength: ${strength.label}`}
                placement="top"
                enterDelay={300}
              >
                <TextField
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  required
                  fullWidth
                  value={password}
                  autoComplete="new-password"
                  onChange={e => setPassword(e.target.value)}
                  inputProps={{ minLength: 8 }}
                />
              </Tooltip>
              <Stack spacing={1}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((strength.score / 4) * 100, 100)}
                  color={
                    strength.score < 2
                      ? 'error'
                      : strength.score < 3
                        ? 'warning'
                        : 'success'
                  }
                  aria-label="Password strength"
                />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    {strength.label}
                  </Typography>
                  <Button
                    type="button"
                    size="small"
                    onClick={() => setShowPw(s => !s)}
                    sx={{ textTransform: 'none' }}
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </Button>
                </Stack>
              </Stack>
              {registerMutation.isError && (
                <Alert severity="error" variant="outlined">
                  {registerMutation.error?.message || 'Registration failed'}
                </Alert>
              )}
              {businessError && (
                <Alert severity="error" variant="outlined">
                  {businessError.message}
                  {businessError.code === 'REGISTER_EMAIL_EXISTS' && (
                    <>
                      {' '}
                      {businessError.message.includes('Google') ? (
                        <Typography
                          component="span"
                          variant="caption"
                          display="block"
                          mt={1}
                        >
                          Sign in using the original social provider, then
                          (optionally) add a password from Profile &gt;
                          Security.
                        </Typography>
                      ) : (
                        <Typography
                          component="span"
                          variant="caption"
                          display="block"
                          mt={1}
                        >
                          You can sign in instead:{' '}
                          <Button href="/login" size="small">
                            Go to Login
                          </Button>
                        </Typography>
                      )}
                    </>
                  )}
                </Alert>
              )}
              {registerMutation.isSuccess && registerMutation.data.ok && (
                <Alert severity="success" variant="outlined">
                  Account created. Redirecting...
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!canSubmit}
                sx={{ py: 1.2 }}
              >
                {registerMutation.isLoading ? 'Registering...' : 'Register'}
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2" textAlign="center">
            Already have an account?{' '}
            <Button
              href="/login"
              variant="text"
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Sign in
            </Button>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}

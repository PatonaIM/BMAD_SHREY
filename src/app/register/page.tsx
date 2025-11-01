'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
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
        // Automatically sign in the user after successful registration
        const signInResult = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Successful login, redirect to dashboard
          router.push('/dashboard');
        } else {
          // Sign in failed, redirect to login page with message
          router.push('/login?registered=1');
        }
      }
    } catch {
      /* error handled via mutation state */
    }
  }

  return (
    <main className="max-w-md mx-auto py-12 px-4">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold text-center mb-2">
          Create Account
        </h1>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center mb-4">
          Use a valid email and a strong password (min 8 chars).
        </p>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-medium">
              Password
            </label>
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              className="input"
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2 w-full">
                <div className="h-2 flex-1 rounded bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                  <div
                    className={`h-full transition-all ${strength.score < 2 ? 'bg-red-500' : strength.score < 3 ? 'bg-yellow-500' : strength.score < 4 ? 'bg-green-500' : 'bg-emerald-600'}`}
                    style={{
                      width: `${Math.min((strength.score / 4) * 100, 100)}%`,
                    }}
                    aria-label="Password strength"
                  />
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {strength.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="text-[10px] font-medium text-brand-primary hover:underline ml-2"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {registerMutation.isError && (
            <div className="text-xs rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
              {registerMutation.error?.message || 'Registration failed'}
            </div>
          )}
          {businessError && (
            <div className="text-xs rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
              {businessError.message}
              {businessError.code === 'REGISTER_EMAIL_EXISTS' && (
                <div className="mt-2">
                  {businessError.message.includes('Google') ? (
                    <span className="block text-[10px]">
                      Sign in using the original social provider, then
                      (optionally) add a password from Profile &gt; Security.
                    </span>
                  ) : (
                    <span className="block text-[10px]">
                      You can sign in instead:{' '}
                      <a href="/login" className="underline">
                        Go to Login
                      </a>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {registerMutation.isSuccess && registerMutation.data.ok && (
            <div className="text-xs rounded-md border border-green-300 bg-green-50 dark:bg-green-900/20 p-3 text-green-700 dark:text-green-300">
              Account created successfully! Signing you in...
            </div>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`btn-primary w-full px-4 py-2 text-sm font-medium ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {' '}
            {registerMutation.isLoading ? 'Registering…' : 'Register'}{' '}
          </button>
        </form>
        <p className="text-xs text-center mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-brand-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

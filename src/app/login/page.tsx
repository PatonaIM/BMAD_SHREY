'use client';
import React, { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { SocialProviderButton } from '../../components/SocialProviderButton';

const errorMap: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password',
  AccessDenied: 'Access denied',
  MissingOAuthEmail:
    'Your provider did not supply an email. Please register with email/password.',
  OAuthProviderInternal:
    'OAuth login failed. Please try again or use credentials signup.',
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
    <main className="max-w-md mx-auto py-12 px-4">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold text-center mb-4">
          Welcome Back
        </h1>
        {authError && !formError && (
          <div className="mb-4 text-sm rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
            {errorMap[authError] || authError}
          </div>
        )}
        {formError && (
          <div className="mb-4 text-sm rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}
        <OAuthButtons />
        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700" />
          <span className="px-3 text-xs text-neutral-500">or use email</span>
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700" />
        </div>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
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
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full px-4 py-2 text-sm font-medium"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="flex justify-between mt-1 text-xs">
            <a
              href={`/register${params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect')!)}` : ''}`}
              className="text-brand-primary hover:underline"
            >
              Need an account? Register
            </a>
            <a
              href="/password-reset"
              className="text-brand-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </main>
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
    <div className="flex flex-col gap-2">
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
    </div>
  );
}

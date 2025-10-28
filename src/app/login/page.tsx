'use client';
import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

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
  const router = useRouter();
  const authError = params.get('error');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!res) {
      setFormError('Unexpected error');
      return;
    }
    if (res.error) {
      setFormError(errorMap[res.error] || 'Login failed');
      return;
    }
    // success
    router.push('/');
  }

  return (
    <main
      style={{ maxWidth: 400, margin: '2rem auto', fontFamily: 'system-ui' }}
    >
      <h2>Sign In</h2>
      {authError && !formError && (
        <div style={{ color: 'crimson', marginBottom: '0.5rem' }}>
          {errorMap[authError] || authError}
        </div>
      )}
      {formError && (
        <div style={{ color: 'crimson', marginBottom: '0.5rem' }}>
          {formError}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        aria-label="login form"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem',
            background: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}

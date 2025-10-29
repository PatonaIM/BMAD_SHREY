'use client';
import React, { useEffect, useState } from 'react';
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
    <main className="max-w-md mx-auto py-12 px-4">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold text-center mb-2">
          Reset Password
        </h1>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
          Enter your account email and we'll send a reset link if this feature
          is enabled.
        </p>
        {requestMutation.isSuccess ? (
          <div className="text-xs rounded-md border border-green-300 bg-green-50 dark:bg-green-900/20 p-3 text-green-700 dark:text-green-300 mb-4">
            If the email exists, a link was generated (token logged
            server-side).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
            <div className="flex flex-col gap-1">
              <label htmlFor="reset-email" className="text-xs font-medium">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
              />
            </div>
            {requestMutation.isError && (
              <div className="text-xs rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
                {requestMutation.error?.message || 'Failed'}
              </div>
            )}
            <button
              type="submit"
              disabled={!email || requestMutation.isLoading}
              className={`btn-primary w-full px-4 py-2 text-sm font-medium ${!email || requestMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {requestMutation.isLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700" />
          <span className="px-3 text-xs text-neutral-500">Use token</span>
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700" />
        </div>
        <form onSubmit={handlePerform} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="token" className="text-xs font-medium">
              Token
            </label>
            <input
              id="token"
              required
              value={token}
              onChange={e => setToken(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword" className="text-xs font-medium">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input"
            />
          </div>
          {performMutation.isError && (
            <div className="text-xs rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
              {performMutation.error?.message || 'Failed'}
            </div>
          )}
          {performMutation.isSuccess && (
            <div className="text-xs rounded-md border border-green-300 bg-green-50 dark:bg-green-900/20 p-3 text-green-700 dark:text-green-300">
              Password updated. You can now log in.
            </div>
          )}
          <button
            type="submit"
            disabled={!token || !newPassword || performMutation.isLoading}
            className={`btn-primary w-full px-4 py-2 text-sm font-medium ${!token || !newPassword || performMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {performMutation.isLoading ? 'Resetting…' : 'Reset Password'}
          </button>
          <a
            href="/login"
            className="text-xs text-center text-brand-primary hover:underline mt-2"
          >
            Back to login
          </a>
        </form>
      </div>
    </main>
  );
}

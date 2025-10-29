'use client';
import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AuthStatus(): React.ReactElement {
  const { data: session, status } = useSession();
  if (status === 'loading') {
    return <p className="mt-4 text-sm text-neutral-500">Loading auth…</p>;
  }
  if (!session) {
    return (
      <div className="mt-4 text-sm flex flex-col gap-1">
        <p className="text-neutral-700 dark:text-neutral-300">
          You are not signed in.
        </p>
        <Link href="/login" className="text-brand-primary hover:underline">
          Go to login
        </Link>
      </div>
    );
  }
  const sUser = session.user as { email?: string | null; roles?: string[] };
  const roles = sUser.roles || [];
  return (
    <div className="mt-4 flex flex-col gap-2 text-sm">
      <p className="text-neutral-700 dark:text-neutral-300">
        Signed in as <strong>{session.user?.email}</strong>
        {roles.length ? ` (roles: ${roles.join(', ')})` : ''}
      </p>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="btn-outline px-3 py-1.5 text-xs"
      >
        Sign Out
      </button>
    </div>
  );
}

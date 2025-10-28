'use client';
import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AuthStatus(): React.ReactElement {
  const { data: session, status } = useSession();
  if (status === 'loading') return <p>Loading auth…</p>;
  if (!session) {
    return (
      <div style={{ marginTop: '1rem' }}>
        <p>You are not signed in.</p>
        <Link href="/login">Go to login</Link>
      </div>
    );
  }
  interface SessionUserWithRoles {
    email?: string | null;
    roles?: string[];
  }
  const sUser = session.user as SessionUserWithRoles;
  const roles = sUser.roles || [];
  return (
    <div style={{ marginTop: '1rem' }}>
      <p>
        Signed in as <strong>{session.user?.email}</strong>
        {roles.length ? ` (roles: ${roles.join(', ')})` : ''}
      </p>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        style={{
          padding: '0.5rem 0.75rem',
          background: '#666',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

import React from 'react';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { redirect } from 'next/navigation';

/**
 * Recruiter-specific layout that enforces role-based access
 */
export default async function RecruiterLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated
  if (!session?.user) {
    redirect('/login?callbackUrl=/recruiter');
  }

  // Check if user has recruiter or admin role
  const roles =
    (
      session as unknown as {
        user: {
          roles?: string[];
        };
      }
    )?.user.roles || [];
  const hasRecruiterAccess =
    roles.includes('RECRUITER') || roles.includes('ADMIN');

  if (!hasRecruiterAccess) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}

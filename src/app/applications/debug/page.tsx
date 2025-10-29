import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { redirect } from 'next/navigation';
import { applicationRepo } from '../../../data-access/repositories/applicationRepo';
import Link from 'next/link';

export default async function ApplicationsDebugPage() {
  const session = await getServerSession(authOptions);
  const userEmail = (session?.user as { email?: string })?.email;

  if (!userEmail) {
    redirect('/login');
  }

  const applications = await applicationRepo.findByUserEmail(userEmail);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Debug: Your Applications</h1>

      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <p className="text-sm">
          <strong>User Email:</strong> {userEmail}
        </p>
        <p className="text-sm">
          <strong>Total Applications:</strong> {applications.length}
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="p-6 border border-dashed border-neutral-300 dark:border-neutral-700 rounded text-center">
          <p className="text-muted-foreground mb-4">
            No applications found. Try submitting an application to a job first.
          </p>
          <Link href="/" className="btn-primary px-4 py-2 inline-block">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div
              key={app._id}
              className="p-4 border border-neutral-200 dark:border-neutral-800 rounded"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">Application ID: {app._id}</p>
                  <p className="text-sm text-muted-foreground">
                    Job ID: {app.jobId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {app.status}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Applied: {app.appliedAt.toLocaleString()}
                  </p>
                  {app.resumeVersionId && (
                    <p className="text-sm text-muted-foreground">
                      Resume: {app.resumeVersionId}
                    </p>
                  )}
                </div>
                <Link
                  href={`/applications/${app._id}`}
                  className="btn-outline px-3 py-1 text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

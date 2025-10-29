'use client';
import React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ApplyButtonProps {
  jobId: string;
  label?: string;
  redirectOnAuth?: boolean;
  className?: string;
}

export function ApplyButton({
  jobId,
  label,
  redirectOnAuth = true,
  className = 'btn-primary px-4 py-2 text-xs',
}: ApplyButtonProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = React.useState(false);
  const loading = status === 'loading';

  const handleClick = () => {
    if (loading) return;
    if (!session) {
      setOpen(true);
    }
  };

  if (session) {
    return (
      <Link
        href={`/jobs/${jobId}/apply`}
        aria-label={`Apply to job ${jobId}`}
        className={className}
      >
        {label || 'Apply Now'}
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Open login dialog to apply"
        className={className.replace('btn-primary', 'btn-outline')}
      >
        {label || 'Login to Apply'}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-auth-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 shadow-lg animate-fadeIn">
            <h2 id="apply-auth-title" className="text-lg font-semibold mb-2">
              Login Required
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
              You need an account to apply. Login or create a free account to
              continue.
            </p>
            <div className="flex gap-3 mb-4">
              <Link
                href={`/login${redirectOnAuth ? `?redirect=/jobs/${jobId}/apply` : ''}`}
                className="btn-primary px-4 py-2 text-xs font-medium flex-1 text-center"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-outline px-4 py-2 text-xs font-medium flex-1 text-center"
              >
                Sign Up
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-outline w-full px-3 py-1.5 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

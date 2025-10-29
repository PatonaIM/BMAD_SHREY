import React from 'react';
import Link from 'next/link';
import type { Session } from 'next-auth';

interface HeroProps {
  session: Session | null;
}

export function Hero({ session }: HeroProps): React.ReactElement {
  return (
    <section
      aria-labelledby="hero-heading"
      className="py-8 md:py-14 flex flex-col items-start gap-6"
    >
      <h1
        id="hero-heading"
        className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent"
      >
        Smarter Job Matching. Faster Progress.
      </h1>
      <p className="max-w-2xl text-base md:text-lg text-neutral-600 dark:text-neutral-300">
        Teamified connects talent to opportunity using AI-enhanced scoring and
        interview insights. Discover roles, apply in seconds, and track progress
        transparently.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="#job-results-heading"
          aria-label="Browse open roles"
          className="btn-primary px-5 py-3 text-sm font-semibold shadow-glow"
        >
          Browse Roles
        </Link>
        {session ? (
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="btn-outline px-5 py-3 text-sm font-semibold"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/register"
            aria-label="Create account"
            className="btn-outline px-5 py-3 text-sm font-semibold"
          >
            Create Account
          </Link>
        )}
      </div>
    </section>
  );
}

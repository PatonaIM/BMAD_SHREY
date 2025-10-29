'use client';
import React from 'react';
import type { ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DarkModeToggle } from './DarkModeToggle';
import { Footer } from './Footer';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const linksPublic = [
    { label: 'Home', path: '/' },
    { label: 'Jobs', path: '/jobs' }, // distinct path for unique key
  ];
  const linksAuthed = [{ label: 'Dashboard', path: '/dashboard' }];
  const isActive = (p: string) => pathname === p;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full backdrop-blur bg-white/80 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-700">
        <div className="container-responsive flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary rounded"
            >
              Teamified
            </Link>
            <nav
              className="hidden md:flex items-center gap-2"
              aria-label="Main navigation"
            >
              {linksPublic.map(l => (
                <Link
                  key={l.path}
                  href={l.path}
                  className={
                    'btn-ghost px-3 py-2 text-sm font-medium rounded-md transition focus-visible:ring-2 focus-visible:ring-brand-primary ' +
                    (isActive(l.path)
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800')
                  }
                >
                  {l.label}
                </Link>
              ))}
              {session &&
                linksAuthed.map(l => (
                  <Link
                    key={l.path}
                    href={l.path}
                    className={
                      'btn-ghost px-3 py-2 text-sm font-medium rounded-md transition focus-visible:ring-2 focus-visible:ring-brand-primary ' +
                      (isActive(l.path)
                        ? 'bg-neutral-100 dark:bg-neutral-800'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800')
                    }
                  >
                    {l.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            {status === 'loading' && (
              <div
                className="h-8 w-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700"
                aria-label="Loading session"
              />
            )}
            {session ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="btn-ghost px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="btn-ghost px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="btn-primary px-3 py-1.5 text-sm shadow-glow"
                >
                  Sign Up
                </Link>
              </div>
            )}
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen(o => !o)}
            >
              <span className="sr-only">Menu</span>
              <div className="space-y-1.5">
                <span className="block h-0.5 w-5 bg-neutral-900 dark:bg-neutral-200" />
                <span className="block h-0.5 w-5 bg-neutral-900 dark:bg-neutral-200" />
                <span className="block h-0.5 w-5 bg-neutral-900 dark:bg-neutral-200" />
              </div>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 animate-slideUp">
            <div
              className="container-responsive py-4 flex flex-col gap-2"
              role="menu"
            >
              {[...linksPublic, ...(session ? linksAuthed : [])].map(l => (
                <Link
                  key={l.path}
                  href={l.path}
                  onClick={() => setMobileOpen(false)}
                  className={
                    'px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 ' +
                    (isActive(l.path)
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : '')
                  }
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">
        <div className="container-responsive py-6">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

import React from 'react';
import Link from 'next/link';

export function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-2 flex flex-col gap-3">
            <Link
              href="/"
              className="text-xl font-semibold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent"
            >
              Teamified
            </Link>
            <p className="text-xs leading-relaxed max-w-sm">
              AI-powered job application platform connecting talent with
              opportunity through intelligent matching and transparent feedback.
            </p>
            <div className="flex gap-3 mt-2">
              {[
                { label: 'GitHub', href: 'https://github.com', icon: 'GH' },
                { label: 'LinkedIn', href: 'https://linkedin.com', icon: 'In' },
                { label: 'Twitter', href: 'https://twitter.com', icon: 'Tw' },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-brand-primary/20 transition-colors text-[10px] font-semibold"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <h6 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Platform
            </h6>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/"
                  className="hover:text-brand-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-brand-primary transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="hover:text-brand-primary transition-colors"
                >
                  Register
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-brand-primary transition-colors"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <h6 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Company
            </h6>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/about"
                  className="hover:text-brand-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="hover:text-brand-primary transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-brand-primary transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <h6 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Legal
            </h6>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-brand-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-brand-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 text-center text-xs opacity-70">
          © {currentYear} Teamified. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

'use client';
import React from 'react';

export function DarkModeToggle(): React.ReactElement {
  const [mounted, setMounted] = React.useState(false);
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="h-9 w-9 rounded-md border border-neutral-300 dark:border-neutral-600 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
    >
      {mounted && (
        <span className="text-sm" aria-hidden="true">
          {dark ? '🌙' : '☀️'}
        </span>
      )}
    </button>
  );
}

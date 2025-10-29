'use client';
import React, { useEffect } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  variant?: 'up' | 'fade';
  delay?: number; // ms
}

// Adds intersection observer to fade/translate elements into view
export function ScrollReveal({
  children,
  className = '',
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
}: ScrollRevealProps) {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('reveal-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      data-reveal
      style={{ transitionDelay: `${delay}ms` }}
      className={`opacity-0 translate-y-4 will-change-transform transition-all duration-700 ease-out ${
        variant === 'up' ? '' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

// Global styles can target .reveal-in for final state via tailwind utilities in a CSS layer.

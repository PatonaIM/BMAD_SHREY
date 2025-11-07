'use client';

import { useMediaQuery } from './useMediaQuery';

/**
 * Predefined breakpoints matching Tailwind CSS defaults
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

/**
 * useBreakpoints hook for easy responsive checks
 *
 * Usage:
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useBreakpoints();
 *
 * // Or check specific breakpoints
 * const { sm, md, lg, xl } = useBreakpoints();
 * ```
 */
export function useBreakpoints() {
  const sm = useMediaQuery(breakpoints.sm);
  const md = useMediaQuery(breakpoints.md);
  const lg = useMediaQuery(breakpoints.lg);
  const xl = useMediaQuery(breakpoints.xl);
  const xxl = useMediaQuery(breakpoints['2xl']);

  return {
    // Raw breakpoints
    sm,
    md,
    lg,
    xl,
    '2xl': xxl,

    // Semantic breakpoints
    isMobile: !md, // < 768px
    isTablet: md && !lg, // 768px - 1023px
    isDesktop: lg, // >= 1024px
    isLargeDesktop: xl, // >= 1280px

    // Helper to check if below a breakpoint
    isBelowSm: !sm,
    isBelowMd: !md,
    isBelowLg: !lg,
    isBelowXl: !xl,
  };
}

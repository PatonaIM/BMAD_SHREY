// EP5-S5: Legacy Interview Theme Tokens (foundation for parity refactor)
// Minimal design token surface extracted from legacy styles for reuse.
// Intention: allow V2 components to adopt look & feel without tightly coupling to ad-hoc class strings.

export const legacyInterviewTheme = {
  colors: {
    surface: 'var(--legacy-surface, #f8fafc)',
    surfaceAlt: 'var(--legacy-surface-alt, #ffffff)',
    surfaceDark: 'var(--legacy-surface-dark, #0f172a)',
    border: 'var(--legacy-border, #e2e8f0)',
    borderDark: 'var(--legacy-border-dark, #334155)',
    accent: 'var(--legacy-accent, #4f46e5)',
    accentHover: 'var(--legacy-accent-hover, #4338ca)',
    accentMuted: 'var(--legacy-accent-muted, #6366f1)',
    danger: 'var(--legacy-danger, #dc2626)',
    warn: 'var(--legacy-warn, #f59e0b)',
    success: 'var(--legacy-success, #16a34a)',
    textPrimary: 'var(--legacy-text-primary, #0f172a)',
    textSecondary: 'var(--legacy-text-secondary, #475569)',
    textInverse: 'var(--legacy-text-inverse, #f1f5f9)',
  },
  spacing: {
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    pill: '999px',
  },
  shadows: {
    card: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.10)',
    popover: '0 4px 12px rgba(0,0,0,0.12)',
    focus: '0 0 0 3px rgba(79,70,229,0.35)',
  },
  typography: {
    titleWeight: 600,
    labelTransform: 'uppercase',
    labelTracking: '0.05em',
  },
};

export type LegacyInterviewTheme = typeof legacyInterviewTheme;

export function applyLegacyTheme(root: HTMLElement = document.documentElement) {
  const { colors } = legacyInterviewTheme;
  Object.entries(colors).forEach(([key, value]) => {
    // Extract raw color if it uses var() expression fallback
    if (value.startsWith('var(')) return; // assume CSS custom properties defined elsewhere
    root.style.setProperty(`--legacy-${key}`, value);
  });
}

// Helper to get a color token (falls back to accent)
export function legacyColor(token: keyof typeof legacyInterviewTheme.colors) {
  return (
    legacyInterviewTheme.colors[token] || legacyInterviewTheme.colors.accent
  );
}

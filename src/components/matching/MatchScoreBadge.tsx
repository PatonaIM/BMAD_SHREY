'use client';

import React from 'react';

export interface MatchScoreBadgeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * MatchScoreBadge Component
 *
 * Displays job-candidate match score with color coding:
 * - Red (<60%): Weak Match
 * - Yellow (60-85%): Good Match
 * - Green (>85%): Excellent Match
 *
 * @example
 * ```tsx
 * <MatchScoreBadge score={78} size="md" showLabel onClick={() => setShowModal(true)} />
 * ```
 */
export function MatchScoreBadge({
  score,
  size = 'md',
  showLabel = false,
  onClick,
  className = '',
}: MatchScoreBadgeProps): React.ReactElement {
  // Determine color based on score thresholds
  const getScoreConfig = (score: number) => {
    if (score >= 85) {
      return {
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-800 dark:text-green-300',
        ringColor: 'ring-green-300 dark:ring-green-700',
        label: 'Excellent Match',
        icon: '⭐',
      };
    } else if (score >= 60) {
      return {
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-800 dark:text-yellow-300',
        ringColor: 'ring-yellow-300 dark:ring-yellow-700',
        label: 'Good Match',
        icon: '✓',
      };
    } else {
      return {
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-800 dark:text-red-300',
        ringColor: 'ring-red-300 dark:ring-red-700',
        label: 'Weak Match',
        icon: '!',
      };
    }
  };

  const config = getScoreConfig(score);

  // Size-specific styles
  const sizeStyles = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'text-xs',
      score: 'text-xs font-semibold',
      label: 'text-[10px]',
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'text-sm',
      score: 'text-sm font-semibold',
      label: 'text-xs',
    },
    lg: {
      container: 'px-4 py-2 text-base',
      icon: 'text-base',
      score: 'text-base font-bold',
      label: 'text-sm',
    },
  };

  const styles = sizeStyles[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-full
        ${config.bgColor} ${config.textColor}
        ring-1 ${config.ringColor}
        ${styles.container}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}
        ${className}
      `}
      aria-label={`Match score: ${score}%. ${config.label}. ${onClick ? 'Click to view details' : ''}`}
      title={onClick ? 'Click to view score breakdown' : undefined}
    >
      <span className={styles.icon} aria-hidden="true">
        {config.icon}
      </span>
      <span className={styles.score}>{score}%</span>
      {showLabel && (
        <span className={`${styles.label} font-medium`}>{config.label}</span>
      )}
    </button>
  );
}

/**
 * StageIcon Component
 *
 * Displays type-specific icons for each stage in the timeline.
 * Uses Lucide React icons with dynamic sizing and colors.
 *
 * @module StageIcon
 */

import React from 'react';
import {
  FileCheck,
  Video,
  Eye,
  FileText,
  Calendar,
  Gift,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { StageType, StageStatus } from '@/shared/types/applicationStage';

interface StageIconProps {
  type: StageType;
  status: StageStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Maps stage types to their corresponding Lucide icons
 */
const STAGE_ICONS: Record<StageType, LucideIcon> = {
  submit_application: FileCheck,
  ai_interview: Video,
  under_review: Eye,
  assignment: FileText,
  live_interview: Calendar,
  offer: Gift,
  offer_accepted: CheckCircle2,
  disqualified: XCircle,
};

/**
 * Maps stage statuses to color classes
 */
const STATUS_COLORS: Record<StageStatus, string> = {
  pending: 'text-neutral-400 dark:text-neutral-600',
  awaiting_candidate: 'text-blue-500 dark:text-blue-400',
  in_progress: 'text-amber-500 dark:text-amber-400',
  awaiting_recruiter: 'text-purple-500 dark:text-purple-400',
  completed: 'text-green-500 dark:text-green-400',
  skipped: 'text-neutral-400 dark:text-neutral-600',
};

/**
 * Maps size variants to pixel dimensions
 */
const SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function StageIcon({
  type,
  status,
  size = 'md',
  className = '',
}: StageIconProps): JSX.Element {
  const Icon = STAGE_ICONS[type];
  const colorClass = STATUS_COLORS[status];
  const sizeValue = SIZE_MAP[size];

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <Icon size={sizeValue} className={colorClass} strokeWidth={2} />
    </div>
  );
}

/**
 * StageIconWithBackground
 *
 * Variant with circular background for more prominent display
 */
interface StageIconWithBackgroundProps extends StageIconProps {
  variant?: 'solid' | 'outline';
}

const STATUS_BG_COLORS: Record<StageStatus, string> = {
  pending:
    'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700',
  awaiting_candidate:
    'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  in_progress:
    'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  awaiting_recruiter:
    'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  completed:
    'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  skipped:
    'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700',
};

export function StageIconWithBackground({
  type,
  status,
  size = 'md',
  variant = 'solid',
  className = '',
}: StageIconWithBackgroundProps): JSX.Element {
  const Icon = STAGE_ICONS[type];
  const colorClass = STATUS_COLORS[status];
  const bgColorClass = STATUS_BG_COLORS[status];

  const containerSizeClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';

  const sizeValue = SIZE_MAP[size];

  return (
    <div
      className={`flex items-center justify-center rounded-full ${containerSizeClass} ${bgColorClass} ${variant === 'outline' ? 'border-2' : ''} ${className}`}
      aria-hidden="true"
    >
      <Icon size={sizeValue} className={colorClass} strokeWidth={2} />
    </div>
  );
}

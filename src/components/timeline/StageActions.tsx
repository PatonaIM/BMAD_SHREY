/**
 * StageActions Component
 *
 * Renders action buttons for a stage based on user role and available actions.
 * Supports both candidate and recruiter actions with role-based visibility.
 *
 * @module StageActions
 */

import React from 'react';
import type {
  CandidateAction,
  RecruiterAction,
} from '@/shared/types/applicationStage';

interface StageActionsProps {
  /** Actions available to candidate */
  candidateActions?: CandidateAction[];

  /** Actions available to recruiter */
  recruiterActions?: RecruiterAction[];

  /** Current viewing role */
  viewAs: 'candidate' | 'recruiter';

  /** Callback when action is clicked */
  onAction?: (_actionType: string) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Maps action types to button labels
 */
const ACTION_LABELS: Record<string, string> = {
  upload_assignment: 'Upload Assignment',
  request_reschedule: 'Request Reschedule',
  accept_offer: 'Accept Offer',
  reject_offer: 'Decline Offer',
  upload_documents: 'Upload Documents',
  view_details: 'View Details',
  give_assignment: 'Give Assignment',
  schedule_interview: 'Schedule Interview',
  provide_feedback: 'Provide Feedback',
  send_offer: 'Send Offer',
  revoke_offer: 'Revoke Offer',
  disqualify: 'Disqualify',
  view_submission: 'View Submission',
  view_recording: 'View Recording',
};

/**
 * Maps action types to button style variants
 */
const ACTION_VARIANTS: Record<
  string,
  'primary' | 'secondary' | 'outline' | 'danger'
> = {
  upload_assignment: 'primary',
  request_reschedule: 'outline',
  accept_offer: 'primary',
  reject_offer: 'danger',
  upload_documents: 'primary',
  view_details: 'outline',
  give_assignment: 'primary',
  schedule_interview: 'primary',
  provide_feedback: 'secondary',
  send_offer: 'primary',
  revoke_offer: 'danger',
  disqualify: 'danger',
  view_submission: 'outline',
  view_recording: 'outline',
};

/**
 * Button variant styles
 */
const VARIANT_STYLES: Record<string, string> = {
  primary:
    'bg-brand-primary hover:bg-brand-primary/90 text-white border-transparent',
  secondary:
    'bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-foreground border-transparent',
  outline:
    'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-foreground border-neutral-300 dark:border-neutral-700',
  danger:
    'bg-red-600 hover:bg-red-700 text-white border-transparent dark:bg-red-700 dark:hover:bg-red-800',
};

export function StageActions({
  candidateActions = [],
  recruiterActions = [],
  viewAs,
  onAction,
  className = '',
}: StageActionsProps): JSX.Element | null {
  const actions = viewAs === 'candidate' ? candidateActions : recruiterActions;

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {actions.map((action, index) => {
        const label = ACTION_LABELS[action.type] || action.label || action.type;
        const variant = ACTION_VARIANTS[action.type] || 'outline';
        const variantStyles = VARIANT_STYLES[variant];

        return (
          <button
            key={`${action.type}-${index}`}
            onClick={() => onAction?.(action.type)}
            disabled={action.enabled === false}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              border transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2
              ${variantStyles}
            `}
            aria-label={label}
          >
            {label}
            {action.enabled === false && action.disabledReason && (
              <span
                className="sr-only"
                title={action.disabledReason}
              >{`(${action.disabledReason})`}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * StageActionsSkeleton
 *
 * Loading skeleton for stage actions
 */
export function StageActionsSkeleton({
  count = 2,
  className = '',
}: {
  count?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={`flex flex-wrap gap-2 ${className} animate-pulse`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg"
        />
      ))}
    </div>
  );
}

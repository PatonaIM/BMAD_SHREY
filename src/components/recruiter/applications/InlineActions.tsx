'use client';

import { MessageSquare, Calendar, Share2, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';

interface InlineActionsProps {
  applicationId: string;
  onFeedback?: () => void;
  onSchedule?: () => void;
  onShare?: () => void;
  onView?: () => void;
}

/**
 * InlineActions - Action buttons toolbar for application cards
 * Features keyboard navigation (Tab, Enter)
 */
export function InlineActions({
  onFeedback,
  onSchedule,
  onShare,
  onView,
}: InlineActionsProps) {
  const actions = [
    {
      id: 'view',
      label: 'View Profile',
      icon: Eye,
      onClick: onView,
      variant: 'primary' as const,
    },
    {
      id: 'feedback',
      label: 'Add Feedback',
      icon: MessageSquare,
      onClick: onFeedback,
      variant: 'secondary' as const,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      onClick: onSchedule,
      variant: 'secondary' as const,
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      onClick: onShare,
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={!action.onClick}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              action.variant === 'primary'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

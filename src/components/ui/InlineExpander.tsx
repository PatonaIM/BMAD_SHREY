'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { cn } from '@/utils/cn';

interface InlineExpanderProps {
  trigger?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  defaultExpanded?: boolean;
  duration?: number;
  onExpandChange?: (_expanded: boolean) => void;
}

/**
 * InlineExpander component for smooth expand/collapse animations
 * Used for inline content expansion without full-page modals
 *
 * Usage:
 * ```tsx
 * <InlineExpander trigger="Show More">
 *   <div>Expanded content here</div>
 * </InlineExpander>
 * ```
 */
export function InlineExpander({
  trigger,
  children,
  className,
  contentClassName,
  defaultExpanded = false,
  duration = 0.3,
  onExpandChange,
}: InlineExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpandChange?.(newState);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center justify-between gap-2',
          'rounded-lg px-4 py-2',
          'text-sm font-medium text-gray-700 dark:text-gray-300',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
        )}
        aria-expanded={isExpanded}
      >
        <span className="flex-1 text-left">
          {trigger || (isExpanded ? 'Show Less' : 'Show More')}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn('pt-2', contentClassName)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface InlineExpanderCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * InlineExpanderCard - Card variant with header and expandable content
 * Commonly used for application cards, suggestion cards, etc.
 */
export function InlineExpanderCard({
  title,
  subtitle,
  badge,
  children,
  className,
  defaultExpanded = false,
}: InlineExpanderCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800',
        'shadow-sm hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      {/* Card Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between gap-3 p-4',
          'text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset'
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

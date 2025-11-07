'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

interface QuickRatingProps {
  applicationId: string;
  initialRating?: number;
  onRate?: (_rating: number) => Promise<void>;
}

/**
 * QuickRating - 5-star rating component with optimistic updates
 * Used for quick feedback on applications
 */
export function QuickRating({ initialRating = 0, onRate }: QuickRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleRate = async (newRating: number) => {
    if (isLoading) return;

    // Optimistic update
    const previousRating = rating;
    setRating(newRating);

    if (onRate) {
      setIsLoading(true);
      try {
        await onRate(newRating);
      } catch {
        // Rollback on error
        setRating(previousRating);
        // Could add toast notification here
      } finally {
        setIsLoading(false);
      }
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(value => (
        <button
          key={value}
          type="button"
          onClick={() => handleRate(value)}
          onMouseEnter={() => setHoveredRating(value)}
          onMouseLeave={() => setHoveredRating(0)}
          disabled={isLoading}
          className={cn(
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label={`Rate ${value} stars`}
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              value <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-none text-gray-300 dark:text-gray-600'
            )}
          />
        </button>
      ))}
      {rating > 0 && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {rating}/5
        </span>
      )}
    </div>
  );
}

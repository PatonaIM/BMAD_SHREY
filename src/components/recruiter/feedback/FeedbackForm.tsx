'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { QuickRating } from './QuickRating';
import { cn } from '@/utils/cn';

interface FeedbackFormProps {
  applicationId: string;
  onSubmit?: (_data: FeedbackData) => Promise<void>;
  onClose?: () => void;
}

interface FeedbackData {
  rating: number;
  notes: string;
  tags: string[];
}

const FEEDBACK_TAGS = [
  'Strong technical skills',
  'Good communication',
  'Team fit',
  'Leadership potential',
  'Needs improvement',
  'Overqualified',
  'Underqualified',
  'Culture fit',
];

/**
 * FeedbackForm - Inline form for adding recruiter feedback
 * Features:
 * - Star rating (QuickRating component)
 * - Notes textarea
 * - Tag selector
 * - Auto-save draft behavior (future enhancement)
 */
export function FeedbackForm({
  applicationId,
  onSubmit,
  onClose,
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert('Please provide a rating');
      return;
    }

    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        notes,
        tags: selectedTags,
      });
      onClose?.();
    } catch {
      // Error handling - could add toast notification here
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Add Feedback
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating
          </label>
          <QuickRating
            applicationId={applicationId}
            initialRating={rating}
            onRate={async newRating => setRating(newRating)}
          />
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="feedback-notes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Notes
          </label>
          <textarea
            id="feedback-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Add your feedback notes here..."
            className={cn(
              'w-full rounded-md border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500'
            )}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  selectedTags.includes(tag)
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md',
              'bg-indigo-600 text-white hover:bg-indigo-700',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}

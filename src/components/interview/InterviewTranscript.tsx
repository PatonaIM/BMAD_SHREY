'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface TranscriptSegment {
  id: string;
  speaker: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isPartial?: boolean; // For streaming deltas
}

interface InterviewTranscriptProps {
  segments: TranscriptSegment[];
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  autoScroll?: boolean;
  className?: string;
}

/**
 * InterviewTranscript - Live transcript display for AI interviews
 *
 * Features:
 * - Real-time delta streaming with partial segment updates
 * - Auto-scroll that respects manual scrolling
 * - ARIA live region for accessibility
 * - Toggle visibility
 * - Timestamp display
 *
 * EP3-S11 Enhancement #1: Live Transcript Rendering
 */
export function InterviewTranscript({
  segments,
  isVisible = true,
  onToggleVisibility,
  autoScroll = true,
  className = '',
}: InterviewTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastScrollTop = useRef(0);
  const scrollCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Detect user scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      // If user scrolls up, disable auto-scroll
      if (scrollTop < lastScrollTop.current) {
        setIsUserScrolling(true);
      }

      // If user scrolls to bottom, re-enable auto-scroll
      if (isAtBottom) {
        setIsUserScrolling(false);
      }

      lastScrollTop.current = scrollTop;

      // Clear existing timeout
      if (scrollCheckTimeout.current) {
        clearTimeout(scrollCheckTimeout.current);
      }

      // Re-enable auto-scroll after 3 seconds of no scrolling
      scrollCheckTimeout.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 3000);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollCheckTimeout.current) {
        clearTimeout(scrollCheckTimeout.current);
      }
    };
  }, []);

  // Auto-scroll when new segments arrive (if enabled and user not scrolling)
  useEffect(() => {
    if (!autoScroll || isUserScrolling || !containerRef.current) return;

    const container = containerRef.current;
    const { scrollHeight, clientHeight } = container;

    // Smooth scroll to bottom
    container.scrollTo({
      top: scrollHeight - clientHeight,
      behavior: 'smooth',
    });
  }, [segments, autoScroll, isUserScrolling]);

  if (!isVisible) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <button
          onClick={onToggleVisibility}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Show Transcript
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Interview Transcript
          </h3>
          {segments.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
              {segments.length} messages
            </span>
          )}
        </div>

        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Hide transcript"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Transcript Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900 min-h-0"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
      >
        {segments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">Transcript will appear here...</p>
          </div>
        ) : (
          segments.map(segment => (
            <div
              key={segment.id}
              className={`flex gap-3 ${segment.speaker === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  segment.speaker === 'ai'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                }`}
              >
                {segment.speaker === 'ai' ? '🤖' : '👤'}
              </div>

              {/* Message Bubble */}
              <div
                className={`flex-1 max-w-[80%] ${segment.speaker === 'user' ? 'text-right' : ''}`}
              >
                <div
                  className={`inline-block px-4 py-2.5 rounded-2xl ${
                    segment.speaker === 'ai'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm'
                      : 'bg-blue-500 text-white rounded-tr-sm'
                  } ${segment.isPartial ? 'animate-pulse' : ''}`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {segment.text}
                    {segment.isPartial && (
                      <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
                    )}
                  </p>
                </div>

                {/* Timestamp */}
                <div
                  className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${segment.speaker === 'user' ? 'text-right' : ''}`}
                >
                  {new Date(segment.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Scroll indicator */}
        {isUserScrolling && (
          <div className="sticky bottom-0 left-0 right-0 flex justify-center py-2">
            <button
              onClick={() => {
                setIsUserScrolling(false);
                if (containerRef.current) {
                  const { scrollHeight, clientHeight } = containerRef.current;
                  containerRef.current.scrollTo({
                    top: scrollHeight - clientHeight,
                    behavior: 'smooth',
                  });
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg transition-colors"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              New messages
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

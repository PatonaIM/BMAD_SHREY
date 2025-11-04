'use client';

import React, { useState, useMemo } from 'react';
import type { InterviewQAPair } from '../../shared/types/interview';

interface InterviewTranscriptViewerProps {
  qaTranscript: InterviewQAPair[];
  currentTime?: number; // Current video playback time in seconds
  onSeek?: (_time: number) => void; // Callback to seek video to timestamp
  className?: string;
}

export function InterviewTranscriptViewer({
  qaTranscript,
  currentTime = 0,
  onSeek,
  className = '',
}: InterviewTranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter transcript based on search and category
  const filteredTranscript = useMemo(() => {
    let filtered = qaTranscript;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        qa => qa.questionCategory === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        qa =>
          qa.question.toLowerCase().includes(query) ||
          qa.answerText.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [qaTranscript, searchQuery, selectedCategory]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: qaTranscript.length,
      technical: 0,
      behavioral: 0,
      experience: 0,
      situational: 0,
    };

    qaTranscript.forEach(qa => {
      counts[qa.questionCategory] = (counts[qa.questionCategory] || 0) + 1;
    });

    return counts;
  }, [qaTranscript]);

  // Find which Q&A is currently active based on video time
  const activeQAIndex = useMemo(() => {
    for (let i = filteredTranscript.length - 1; i >= 0; i--) {
      const qa = filteredTranscript[i];
      if (!qa) continue;
      const dateObj =
        typeof qa.questionAskedAt === 'string'
          ? new Date(qa.questionAskedAt)
          : qa.questionAskedAt;
      const qaStartTime = dateObj.getTime() / 1000 - currentTime;
      if (currentTime >= qaStartTime) {
        return i;
      }
    }
    return -1;
  }, [filteredTranscript, currentTime]);

  const formatTime = (date: Date | string) => {
    // Convert to Date object if string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // Convert to seconds from start of interview
    const seconds = Math.floor(dateObj.getTime() / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (durationInSeconds: number) => {
    if (durationInSeconds < 60) {
      return `${Math.round(durationInSeconds)}s`;
    }
    const mins = Math.floor(durationInSeconds / 60);
    const secs = Math.round(durationInSeconds % 60);
    return `${mins}m ${secs}s`;
  };

  const handleJumpToQuestion = (qa: InterviewQAPair) => {
    if (onSeek) {
      const dateObj =
        typeof qa.questionAskedAt === 'string'
          ? new Date(qa.questionAskedAt)
          : qa.questionAskedAt;
      const timeInSeconds = dateObj.getTime() / 1000;
      onSeek(timeInSeconds);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'behavioral':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'experience':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'situational':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        );
      case 'behavioral':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case 'experience':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case 'situational':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!qaTranscript || qaTranscript.length === 0) {
    return (
      <div
        className={`bg-white rounded-lg shadow-lg p-6 ${className}`}
        data-testid="transcript-viewer-empty"
      >
        <div className="text-center text-gray-500">
          <svg
            className="h-12 w-12 mx-auto mb-3 text-gray-300"
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
          <p className="font-medium">No transcript available</p>
          <p className="text-sm mt-1">
            This interview does not have a Q&A transcript yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Interview Transcript
        </h3>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search questions or answers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              'all',
              'technical',
              'behavioral',
              'experience',
              'situational',
            ] as const
          ).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all'
                ? `All (${categoryCounts.all})`
                : `${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryCounts[category] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Transcript Items */}
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {filteredTranscript.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No results found for your search.</p>
          </div>
        ) : (
          filteredTranscript.map((qa, index) => {
            const isActive = index === activeQAIndex;

            return (
              <div
                key={qa.questionId}
                className={`border rounded-lg p-4 transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getCategoryColor(qa.questionCategory)}`}
                    >
                      {getCategoryIcon(qa.questionCategory)}
                      {qa.questionCategory}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(qa.questionAskedAt)}
                    </span>
                  </div>

                  {onSeek && (
                    <button
                      onClick={() => handleJumpToQuestion(qa)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Jump to this moment"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Play
                    </button>
                  )}
                </div>

                {/* Question */}
                <div className="mb-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600">
                          AI
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {qa.question}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Answer */}
                <div className="mb-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                        <svg
                          className="h-3.5 w-3.5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {qa.answerText || '(No response recorded)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Answer Metadata */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Duration: {formatDuration(qa.answerDuration)}</span>
                  </div>

                  {qa.confidence !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Confidence: {Math.round(qa.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {filteredTranscript.length} of {qaTranscript.length} question
            {qaTranscript.length !== 1 ? 's' : ''}{' '}
            {searchQuery || selectedCategory !== 'all' ? 'shown' : 'total'}
          </span>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

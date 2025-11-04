'use client';

import React from 'react';

export type AIVoice = 'alloy' | 'echo' | 'shimmer';

interface VoiceSelectorProps {
  selectedVoice: AIVoice;
  onVoiceChange: (_voice: AIVoice) => void;
  disabled?: boolean;
  className?: string;
}

interface VoiceOption {
  value: AIVoice;
  name: string;
  description: string;
  icon: string;
}

const voiceOptions: VoiceOption[] = [
  {
    value: 'alloy',
    name: 'Alloy',
    description: 'Balanced and professional',
    icon: '🎙️',
  },
  {
    value: 'echo',
    name: 'Echo',
    description: 'Clear and articulate',
    icon: '🔊',
  },
  {
    value: 'shimmer',
    name: 'Shimmer',
    description: 'Warm and friendly',
    icon: '✨',
  },
];

/**
 * VoiceSelector - Choose AI interviewer voice
 *
 * Features:
 * - Pre-interview voice selection
 * - Persisted via session configuration
 * - Visual cards with descriptions
 *
 * EP3-S11 Enhancement #2: Voice Selection & Session Prefs
 */
export function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  disabled = false,
  className = '',
}: VoiceSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
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
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Choose AI Interviewer Voice
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {voiceOptions.map(voice => {
          const isSelected = selectedVoice === voice.value;

          return (
            <button
              key={voice.value}
              onClick={() => !disabled && onVoiceChange(voice.value)}
              disabled={disabled}
              className={`
                p-4 rounded-xl border-2 transition-all text-left
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{voice.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4
                      className={`text-sm font-semibold ${
                        isSelected
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {voice.name}
                    </h4>
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-blue-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {voice.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Selection Display */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Selected:{' '}
          <span className="font-medium text-gray-900 dark:text-white">
            {voiceOptions.find(v => v.value === selectedVoice)?.name}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Compact voice selector for in-interview display
 */
export function VoiceIndicator({
  voice,
  className = '',
}: {
  voice: AIVoice;
  className?: string;
}) {
  const voiceOption = voiceOptions.find(v => v.value === voice);

  if (!voiceOption) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 ${className}`}
    >
      <span>{voiceOption.icon}</span>
      <span>{voiceOption.name} voice</span>
    </div>
  );
}

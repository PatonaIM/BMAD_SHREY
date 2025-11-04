'use client';

import React from 'react';

export type TurnTakingState = 'ai-speaking' | 'listening' | 'user-speaking';

interface TurnTakingIndicatorProps {
  state: TurnTakingState;
  transitionSpeed?: number; // ms for state transition animation
  className?: string;
}

/**
 * TurnTakingIndicator - Visual indicator for conversation state
 *
 * Features:
 * - Distinct states: AI Speaking, Listening, User Speaking
 * - Fast state transitions (<150ms)
 * - Color-coded feedback
 * - Animated icons
 *
 * EP3-S11 Enhancement #3: Turn-Taking Indicators
 */
export function TurnTakingIndicator({
  state,
  transitionSpeed = 100,
  className = '',
}: TurnTakingIndicatorProps) {
  const getStateConfig = () => {
    switch (state) {
      case 'ai-speaking':
        return {
          icon: (
            <svg
              className="w-5 h-5 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          ),
          text: 'AI Speaking',
          bgColor: 'bg-purple-100 dark:bg-purple-900',
          textColor: 'text-purple-700 dark:text-purple-300',
          borderColor: 'border-purple-300 dark:border-purple-700',
          pulseColor: 'bg-purple-500',
        };
      case 'listening':
        return {
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          ),
          text: 'Listening',
          bgColor: 'bg-blue-100 dark:bg-blue-900',
          textColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-300 dark:border-blue-700',
          pulseColor: 'bg-blue-500',
        };
      case 'user-speaking':
        return {
          icon: (
            <svg
              className="w-5 h-5 animate-bounce"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z"
                clipRule="evenodd"
              />
            </svg>
          ),
          text: 'You Speaking',
          bgColor: 'bg-green-100 dark:bg-green-900',
          textColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-300 dark:border-green-700',
          pulseColor: 'bg-green-500',
        };
    }
  };

  const config = getStateConfig();

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-full border-2 transition-all ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
      style={{ transitionDuration: `${transitionSpeed}ms` }}
    >
      {/* Animated Pulse Dot */}
      <div className="relative">
        <div
          className={`w-3 h-3 ${config.pulseColor} rounded-full animate-ping absolute`}
        />
        <div className={`w-3 h-3 ${config.pulseColor} rounded-full relative`} />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0">{config.icon}</div>

      {/* Text */}
      <span className="text-sm font-semibold whitespace-nowrap">
        {config.text}
      </span>
    </div>
  );
}

/**
 * Compact turn-taking indicator for minimal UI
 */
export function CompactTurnIndicator({
  state,
  className = '',
}: {
  state: TurnTakingState;
  className?: string;
}) {
  const getColor = () => {
    switch (state) {
      case 'ai-speaking':
        return 'bg-purple-500';
      case 'listening':
        return 'bg-blue-500';
      case 'user-speaking':
        return 'bg-green-500';
    }
  };

  const getText = () => {
    switch (state) {
      case 'ai-speaking':
        return 'AI';
      case 'listening':
        return '👂';
      case 'user-speaking':
        return 'You';
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 transition-all ${className}`}
    >
      <div
        className={`w-2 h-2 ${getColor()} rounded-full ${state !== 'listening' ? 'animate-pulse' : ''}`}
      />
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {getText()}
      </span>
    </div>
  );
}

/**
 * Hook to manage turn-taking state with timing
 */
export function useTurnTakingState() {
  const [state, setState] = React.useState<TurnTakingState>('listening');
  const [lastTransition, setLastTransition] = React.useState<number>(
    Date.now()
  );

  const updateState = React.useCallback(
    (newState: TurnTakingState) => {
      const now = Date.now();
      const timeSinceLastTransition = now - lastTransition;

      // Log slow transitions (>150ms indicates performance issue)
      if (
        process.env.NODE_ENV === 'development' &&
        timeSinceLastTransition > 150
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          `Slow turn state transition: ${timeSinceLastTransition}ms (target <150ms)`
        );
      }

      setState(newState);
      setLastTransition(now);
    },
    [lastTransition]
  );

  return {
    state,
    updateState,
    lastTransition,
  };
}

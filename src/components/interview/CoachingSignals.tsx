/**
 * Base Coaching Signal Component
 *
 * Displays real-time coaching signals from Gemini Live parallel pipeline.
 * Target latency: <700ms from signal detection to UI display.
 *
 * EP3-S4: Real-time AI Interview Interface - Coaching Signals
 */

'use client';

import { useEffect, useState } from 'react';

/**
 * Coaching signal types from Gemini Live
 */
export type CoachingSignalType =
  | 'off_topic'
  | 'answer_too_long'
  | 'low_confidence'
  | 'unclear_explanation'
  | 'missing_structure'
  | 'incorrect_fact';

/**
 * Coaching signal severity levels
 */
export type SignalSeverity = 'info' | 'warning' | 'error';

/**
 * Coaching signal data structure
 */
export interface CoachingSignal {
  type: CoachingSignalType;
  severity: SignalSeverity;
  message: string;
  timestamp: Date;
  duration?: number; // how long to display (ms)
  confidence?: number; // 0-1, confidence in signal detection
}

/**
 * Signal configuration
 */
interface SignalConfig {
  icon: string; // SVG path or Unicode icon
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
  defaultDuration: number; // ms
  description: string;
}

const SIGNAL_CONFIGS: Record<CoachingSignalType, SignalConfig> = {
  off_topic: {
    icon: '⚠️',
    colorClass: 'text-orange-700',
    bgColorClass: 'bg-orange-50',
    borderColorClass: 'border-orange-700',
    defaultDuration: 3000,
    description: 'Response wandering off topic',
  },
  answer_too_long: {
    icon: '⏱️',
    colorClass: 'text-amber-800',
    bgColorClass: 'bg-amber-50',
    borderColorClass: 'border-amber-800',
    defaultDuration: 2000,
    description: 'Response exceeding optimal length',
  },
  low_confidence: {
    icon: '❓',
    colorClass: 'text-blue-700',
    bgColorClass: 'bg-blue-50',
    borderColorClass: 'border-blue-700',
    defaultDuration: 3000,
    description: 'Expressing uncertainty or hesitation',
  },
  unclear_explanation: {
    icon: '📄',
    colorClass: 'text-purple-700',
    bgColorClass: 'bg-purple-50',
    borderColorClass: 'border-purple-700',
    defaultDuration: 3000,
    description: 'Explanation lacks clarity',
  },
  missing_structure: {
    icon: '🏗️',
    colorClass: 'text-cyan-700',
    bgColorClass: 'bg-cyan-50',
    borderColorClass: 'border-cyan-700',
    defaultDuration: 3000,
    description: 'Response needs better organization',
  },
  incorrect_fact: {
    icon: '❌',
    colorClass: 'text-red-700',
    bgColorClass: 'bg-red-50',
    borderColorClass: 'border-red-700',
    defaultDuration: 4000,
    description: 'Factually incorrect statement detected',
  },
};

export interface CoachingSignalProps {
  signal: CoachingSignal;
  onDismiss?: () => void;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  showConfidence?: boolean;
}

/**
 * Base coaching signal display component
 */
export function CoachingSignalDisplay({
  signal,
  onDismiss,
  position = 'top-right',
  showConfidence = false,
}: CoachingSignalProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const config = SIGNAL_CONFIGS[signal.type];
  const duration = signal.duration || config.defaultDuration;

  useEffect(() => {
    // Fade in
    const showTimeout = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss after duration
    const hideTimeout = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setDismissed(true);
        onDismiss?.();
      }, 300); // Wait for fade out
    }, duration);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [duration, onDismiss]);

  if (dismissed) return null;

  const positionClasses = {
    'top-right': 'top-20 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-20 left-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[1400] min-w-[280px] max-w-[360px] transition-all duration-300 ease-in-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2.5'
      }`}
    >
      <div
        className={`${config.bgColorClass} border-2 ${config.borderColorClass} rounded-lg p-4 shadow-lg flex items-start gap-3`}
      >
        {/* Icon */}
        <div
          className={`${config.colorClass} flex-shrink-0 text-2xl mt-0.5`}
          role="img"
          aria-label={config.description}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className={`font-semibold ${config.colorClass} mb-1 text-sm`}>
            {config.description}
          </div>
          <div className="text-gray-600 text-sm">{signal.message}</div>

          {/* Confidence indicator */}
          {showConfidence && signal.confidence !== undefined && (
            <div className="text-gray-400 text-xs mt-1">
              Confidence: {Math.round(signal.confidence * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Coaching signal manager - handles queue and display
 */
export function useCoachingSignals() {
  const [activeSignals, setActiveSignals] = useState<
    Array<CoachingSignal & { id: string }>
  >([]);
  const [latency, setLatency] = useState<number>(0);

  /**
   * Add new signal to queue
   */
  const addSignal = (signal: CoachingSignal) => {
    const signalWithId = {
      ...signal,
      id: `${signal.type}-${Date.now()}`,
    };

    setActiveSignals(prev => [...prev, signalWithId]);

    // Track latency (time from timestamp to now)
    const latencyMs = Date.now() - signal.timestamp.getTime();
    setLatency(latencyMs);

    // Log warning if latency exceeds target (dev only)
    if (latencyMs > 700 && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Coaching signal latency exceeded target: ${latencyMs}ms (target: <700ms)`,
        signal.type
      );
    }
  };

  /**
   * Remove signal from queue
   */
  const removeSignal = (id: string) => {
    setActiveSignals(prev => prev.filter(s => s.id !== id));
  };

  /**
   * Clear all signals
   */
  const clearSignals = () => {
    setActiveSignals([]);
  };

  return {
    activeSignals,
    addSignal,
    removeSignal,
    clearSignals,
    latency,
  };
}

/**
 * Coaching signals container - displays all active signals
 */
export interface CoachingSignalsContainerProps {
  signals: Array<CoachingSignal & { id: string }>;
  onDismiss: (_id: string) => void;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  showConfidence?: boolean;
}

export function CoachingSignalsContainer({
  signals,
  onDismiss,
  position = 'top-right',
  showConfidence = false,
}: CoachingSignalsContainerProps) {
  return (
    <>
      {signals.map((signal, index) => {
        // Stack signals vertically
        const offset = index * 100; // 100px per signal
        const positionClasses = {
          'top-right': `top-[${80 + offset}px] right-4`,
          'bottom-right': `bottom-[${16 + offset}px] right-4`,
          'top-left': `top-[${80 + offset}px] left-4`,
          'bottom-left': `bottom-[${16 + offset}px] left-4`,
        };

        return (
          <div
            key={signal.id}
            className={`fixed ${positionClasses[position]}`}
            style={{ zIndex: 1400 - index }} // Higher signals have higher z-index
          >
            <CoachingSignalDisplay
              signal={signal}
              onDismiss={() => onDismiss(signal.id)}
              position={position}
              showConfidence={showConfidence}
            />
          </div>
        );
      })}
    </>
  );
}

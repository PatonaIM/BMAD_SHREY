/**
 * InterviewHelperPanel Component
 * Right panel: Displays Gemini text-only coaching signals
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GeminiLiveClient } from '../../../services/ai/geminiLiveClient';
import { CoachingSignalDisplay } from '../CoachingSignals';
import { useInterviewContext } from '../context/InterviewContext';
import type { CoachingSignal } from '../types/interview.types';

export interface InterviewHelperPanelProps {
  questionContext?: {
    text: string;
    category: string;
  } | null;
}

export function InterviewHelperPanel({
  questionContext,
}: InterviewHelperPanelProps) {
  const { sharedState } = useInterviewContext();
  const [coachingSignals, setCoachingSignals] = useState<CoachingSignal[]>([]);
  const [geminiLogs, setGeminiLogs] = useState<
    Array<{
      timestamp: Date;
      message: string;
      type: 'info' | 'error' | 'signal';
    }>
  >([]);

  const geminiClientRef = useRef<GeminiLiveClient | null>(null);

  // Initialize Gemini Live client
  useEffect(() => {
    if (sharedState.phase !== 'interviewing') return;

    const initializeGemini = async () => {
      try {
        setGeminiLogs(prev => [
          ...prev,
          {
            timestamp: new Date(),
            message: 'Initializing Gemini Live client...',
            type: 'info',
          },
        ]);

        geminiClientRef.current = new GeminiLiveClient(
          {
            apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
          },
          {
            onSignalDetected: detection => {
              setCoachingSignals(prev => [...prev, detection.signal]);
              setGeminiLogs(prev => [
                ...prev,
                {
                  timestamp: new Date(),
                  message: `Signal: ${detection.signal.type} - ${detection.signal.message}`,
                  type: 'signal',
                },
              ]);
            },
            onError: err => {
              setGeminiLogs(prev => [
                ...prev,
                {
                  timestamp: new Date(),
                  message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
                  type: 'error',
                },
              ]);
            },
          }
        );

        await geminiClientRef.current.connect(sharedState.sessionId);

        setGeminiLogs(prev => [
          ...prev,
          {
            timestamp: new Date(),
            message: 'Gemini Live connected successfully',
            type: 'info',
          },
        ]);
      } catch (err) {
        setGeminiLogs(prev => [
          ...prev,
          {
            timestamp: new Date(),
            message: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            type: 'error',
          },
        ]);
      }
    };

    initializeGemini();

    return () => {
      if (geminiClientRef.current) {
        geminiClientRef.current.disconnect();
      }
    };
  }, [sharedState.phase, sharedState.sessionId]);

  // Send question context to Gemini when it changes
  useEffect(() => {
    if (questionContext && geminiClientRef.current) {
      setGeminiLogs(prev => [
        ...prev,
        {
          timestamp: new Date(),
          message: `Question context received: ${questionContext.category}`,
          type: 'info',
        },
      ]);
    }
  }, [questionContext]);

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Coaching Signals Section */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 overflow-hidden flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          Interview Helper
        </h3>

        {/* Coaching Signals List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {coachingSignals.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="text-sm">Listening for coaching opportunities...</p>
              <p className="text-xs mt-2">
                AI will provide real-time feedback as you answer
              </p>
            </div>
          ) : (
            coachingSignals.slice(-5).map((signal, index) => (
              <CoachingSignalDisplay
                key={`${signal.type}-${signal.timestamp.getTime()}-${index}`}
                signal={signal}
                onDismiss={() => {
                  setCoachingSignals(prev =>
                    prev.filter(
                      (_, i) => i !== coachingSignals.length - 5 + index
                    )
                  );
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Gemini Debug Panel */}
      <div className="h-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-sm font-semibold text-white">
              Gemini Live Monitor
            </h3>
            <span className="text-xs text-white/80">
              ({geminiLogs.length} events)
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {geminiLogs.length === 0 ? (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
              No Gemini events yet...
            </div>
          ) : (
            geminiLogs.slice(-50).map((log, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded border ${
                  log.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                    : log.type === 'signal'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

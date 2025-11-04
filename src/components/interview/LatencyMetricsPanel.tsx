'use client';

import React, { useEffect, useState } from 'react';

export interface LatencyMetrics {
  lastResponseLatency: number | null; // ms
  averageResponseLatency: number; // ms
  minResponseLatency: number; // ms
  maxResponseLatency: number; // ms
  totalResponses: number;
  audioChunkCount: number;
  audioChunkLatencies: number[]; // Recent 10 latencies
  connectionUptime: number; // seconds
  reconnectCount: number;
}

interface LatencyMetricsPanelProps {
  metrics: LatencyMetrics;
  isVisible: boolean;
  onClose?: () => void;
}

/**
 * LatencyMetricsPanel - Dev-only panel for monitoring interview performance
 *
 * Features:
 * - Real-time latency metrics
 * - Rolling averages
 * - Mini chart visualization
 * - Toggle via Ctrl+Alt+L
 *
 * EP3-S11 Enhancement #5: Latency Metrics Visibility
 */
export function LatencyMetricsPanel({
  metrics,
  isVisible,
  onClose,
}: LatencyMetricsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) return null;

  const formatLatency = (ms: number | null) => {
    if (ms === null) return 'N/A';
    return `${Math.round(ms)}ms`;
  };

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLatencyColor = (ms: number | null) => {
    if (ms === null) return 'text-gray-500';
    if (ms < 500) return 'text-green-500';
    if (ms < 1200) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-xs font-mono">
            {formatLatency(metrics.averageResponseLatency)}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-sm font-semibold">Performance Metrics</h3>
          <span className="px-2 py-0.5 bg-yellow-600 text-yellow-100 text-xs font-medium rounded">
            DEV
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Minimize"
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
                d="M20 12H4"
              />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Close (Ctrl+Alt+L)"
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
      </div>

      {/* Metrics Grid */}
      <div className="p-4 space-y-4">
        {/* Response Latency */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Response Latency
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Last</div>
              <div
                className={`text-2xl font-bold font-mono ${getLatencyColor(metrics.lastResponseLatency)}`}
              >
                {formatLatency(metrics.lastResponseLatency)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Average</div>
              <div
                className={`text-2xl font-bold font-mono ${getLatencyColor(metrics.averageResponseLatency)}`}
              >
                {formatLatency(metrics.averageResponseLatency)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Min</div>
              <div className="text-lg font-bold font-mono text-green-400">
                {formatLatency(metrics.minResponseLatency)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Max</div>
              <div className="text-lg font-bold font-mono text-red-400">
                {formatLatency(metrics.maxResponseLatency)}
              </div>
            </div>
          </div>
        </div>

        {/* Mini Chart */}
        {metrics.audioChunkLatencies.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Recent Latencies (10 chunks)
            </h4>
            <div className="bg-gray-800 rounded-lg p-3 h-20 flex items-end gap-1">
              {metrics.audioChunkLatencies.map((latency, index) => {
                const maxLatency = Math.max(...metrics.audioChunkLatencies);
                const height = (latency / maxLatency) * 100;
                const color =
                  latency < 500
                    ? 'bg-green-500'
                    : latency < 1200
                      ? 'bg-yellow-500'
                      : 'bg-red-500';

                return (
                  <div
                    key={index}
                    className={`flex-1 ${color} rounded-t transition-all`}
                    style={{ height: `${height}%` }}
                    title={`${Math.round(latency)}ms`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Connection Stats */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Connection
          </h4>
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Uptime</span>
              <span className="text-sm font-mono text-white">
                {formatUptime(metrics.connectionUptime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Responses</span>
              <span className="text-sm font-mono text-white">
                {metrics.totalResponses}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Audio Chunks</span>
              <span className="text-sm font-mono text-white">
                {metrics.audioChunkCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Reconnects</span>
              <span
                className={`text-sm font-mono ${metrics.reconnectCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}
              >
                {metrics.reconnectCount}
              </span>
            </div>
          </div>
        </div>

        {/* Target Indicators */}
        <div className="bg-gray-800 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Performance Targets
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${metrics.averageResponseLatency < 500 ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-gray-300">Audio latency &lt;500ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${metrics.reconnectCount === 0 ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
              <span className="text-gray-300">Zero reconnections</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${metrics.connectionUptime > 60 ? 'bg-green-500' : 'bg-gray-500'}`}
              />
              <span className="text-gray-300">Stable connection &gt;1min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Press Ctrl+Alt+L to toggle
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to track latency metrics
 */
export function useLatencyMetrics() {
  const [metrics, setMetrics] = useState<LatencyMetrics>({
    lastResponseLatency: null,
    averageResponseLatency: 0,
    minResponseLatency: Infinity,
    maxResponseLatency: 0,
    totalResponses: 0,
    audioChunkCount: 0,
    audioChunkLatencies: [],
    connectionUptime: 0,
    reconnectCount: 0,
  });

  const [startTime] = useState<number>(Date.now());

  // Update uptime every second
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        connectionUptime: Math.floor((Date.now() - startTime) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const recordResponseLatency = (latencyMs: number) => {
    setMetrics(prev => {
      const newTotal = prev.totalResponses + 1;
      const newAverage =
        (prev.averageResponseLatency * prev.totalResponses + latencyMs) /
        newTotal;
      const newLatencies = [...prev.audioChunkLatencies, latencyMs].slice(-10);

      return {
        ...prev,
        lastResponseLatency: latencyMs,
        averageResponseLatency: newAverage,
        minResponseLatency: Math.min(prev.minResponseLatency, latencyMs),
        maxResponseLatency: Math.max(prev.maxResponseLatency, latencyMs),
        totalResponses: newTotal,
        audioChunkCount: prev.audioChunkCount + 1,
        audioChunkLatencies: newLatencies,
      };
    });
  };

  const recordReconnect = () => {
    setMetrics(prev => ({
      ...prev,
      reconnectCount: prev.reconnectCount + 1,
    }));
  };

  return {
    metrics,
    recordResponseLatency,
    recordReconnect,
  };
}

/**
 * Interview Feature Flags
 *
 * Centralized configuration for experimental and toggleable features
 * in the AI interview system.
 *
 * EP3-S11: Real-Time Interview Experience Enhancements
 */

export interface InterviewFeatureFlags {
  // Audio Quality Enhancements
  enableJitterBuffer: boolean;
  enableCrossfade: boolean;
  jitterBufferSize: number; // Number of chunks to buffer (2-3)
  crossfadeDurationMs: number; // 10-15ms

  // Latency & Performance
  enableLatencyMetrics: boolean;
  enableDevPanel: boolean; // Show dev tools (Ctrl+Alt+L)

  // Token Management
  enableProactiveTokenRefresh: boolean;
  tokenRefreshThresholdSeconds: number; // Refresh T-60s before expiry

  // Reconnection
  maxReconnectAttempts: number;
  reconnectDelayMs: number;

  // Backpressure & Safety
  enableBackpressureSafeguards: boolean;
  audioQueueThreshold: number; // Max chunks before pausing (50)

  // Transcript Features
  enableLiveTranscript: boolean;
  transcriptBatchDelayMs: number; // Batch deltas (100ms)

  // Voice Selection
  enableVoiceSelection: boolean;
  defaultVoice: 'alloy' | 'echo' | 'shimmer';
}

/**
 * Default feature flags
 * These can be overridden per-user or per-session in the future
 */
const defaultFeatureFlags: InterviewFeatureFlags = {
  // Audio Quality - ENABLED by default
  enableJitterBuffer: true,
  enableCrossfade: true,
  jitterBufferSize: 2, // Buffer 2 chunks before playing
  crossfadeDurationMs: 12, // 12ms crossfade

  // Latency & Dev Tools - ENABLED in dev, disabled in prod
  enableLatencyMetrics: process.env.NODE_ENV === 'development',
  enableDevPanel: process.env.NODE_ENV === 'development',

  // Token Management - ENABLED by default
  enableProactiveTokenRefresh: true,
  tokenRefreshThresholdSeconds: 60, // Refresh 60s before expiry

  // Reconnection - Conservative defaults
  maxReconnectAttempts: 3,
  reconnectDelayMs: 2000,

  // Backpressure - ENABLED by default
  enableBackpressureSafeguards: true,
  audioQueueThreshold: 50,

  // Transcript - ENABLED by default
  enableLiveTranscript: true,
  transcriptBatchDelayMs: 100,

  // Voice Selection - ENABLED by default
  enableVoiceSelection: true,
  defaultVoice: 'alloy',
};

/**
 * Runtime feature flag state
 * Can be modified dynamically for testing/experimentation
 */
let currentFeatureFlags: InterviewFeatureFlags = { ...defaultFeatureFlags };

/**
 * Get current feature flags
 */
export function getInterviewFeatureFlags(): InterviewFeatureFlags {
  return { ...currentFeatureFlags };
}

/**
 * Update feature flags (partial update)
 */
export function updateInterviewFeatureFlags(
  updates: Partial<InterviewFeatureFlags>
): void {
  currentFeatureFlags = {
    ...currentFeatureFlags,
    ...updates,
  };
}

/**
 * Reset to default flags
 */
export function resetInterviewFeatureFlags(): void {
  currentFeatureFlags = { ...defaultFeatureFlags };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof InterviewFeatureFlags
): boolean {
  const value = currentFeatureFlags[feature];
  return typeof value === 'boolean' ? value : false;
}

/**
 * Get numeric config value
 */
export function getFeatureValue<K extends keyof InterviewFeatureFlags>(
  feature: K
): InterviewFeatureFlags[K] {
  return currentFeatureFlags[feature];
}

/**
 * Expose feature flags to window for dev tools access
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-expect-error - Dev-only global
  window.__interviewFeatureFlags = {
    get: getInterviewFeatureFlags,
    update: updateInterviewFeatureFlags,
    reset: resetInterviewFeatureFlags,
    isEnabled: isFeatureEnabled,
  };
}

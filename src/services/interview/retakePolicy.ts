/**
 * Interview Retake Policy Enforcement
 *
 * Manages the one retake within 24h policy for AI interviews.
 *
 * Policy Rules:
 * - First attempt: Automatic, no restrictions
 * - Second attempt: Allowed within 24h of first attempt completion
 * - Final score: Higher of two attempts
 * - After 24h: No retake available
 *
 * EP3-S4: Real-time AI Interview Interface - Retake Policy
 */

/**
 * Interview attempt record
 */
export interface InterviewAttempt {
  sessionId: string;
  applicationId: string;
  candidateId: string;
  completedAt: Date;
  score: number; // 0-100
  duration: number; // seconds
  questionCount: number;
  transcriptUrl?: string;
}

/**
 * Retake eligibility check result
 */
export interface RetakeEligibility {
  eligible: boolean;
  reason: string;
  attemptsUsed: number;
  maxAttempts: number;
  expiresAt?: Date;
  previousScore?: number;
}

/**
 * Interview scoring result
 */
export interface InterviewResult {
  finalScore: number;
  attemptUsed: 1 | 2;
  allAttempts: InterviewAttempt[];
  improvedScore: boolean;
  improvement?: number;
}

const MAX_ATTEMPTS = 2;
const RETAKE_WINDOW_HOURS = 24;

/**
 * Check if candidate is eligible for retake
 */
export function checkRetakeEligibility(
  applicationId: string,
  attempts: InterviewAttempt[]
): RetakeEligibility {
  const sortedAttempts = [...attempts].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
  );

  const attemptCount = sortedAttempts.length;

  // No previous attempts - first attempt eligible
  if (attemptCount === 0) {
    return {
      eligible: true,
      reason: 'First interview attempt',
      attemptsUsed: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  // Already used maximum attempts
  if (attemptCount >= MAX_ATTEMPTS) {
    const lastAttempt = sortedAttempts[sortedAttempts.length - 1];
    return {
      eligible: false,
      reason: `Maximum ${MAX_ATTEMPTS} attempts already used`,
      attemptsUsed: attemptCount,
      maxAttempts: MAX_ATTEMPTS,
      previousScore: lastAttempt?.score,
    };
  }

  // Check if within 24h window
  const firstAttempt = sortedAttempts[0];
  if (!firstAttempt) {
    throw new Error('No first attempt found');
  }

  const now = new Date();
  const expiresAt = new Date(
    firstAttempt.completedAt.getTime() + RETAKE_WINDOW_HOURS * 60 * 60 * 1000
  );

  if (now > expiresAt) {
    return {
      eligible: false,
      reason: `Retake window expired. Must complete within ${RETAKE_WINDOW_HOURS}h of first attempt`,
      attemptsUsed: attemptCount,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt,
      previousScore: firstAttempt.score,
    };
  }

  // Within window, eligible for retake
  return {
    eligible: true,
    reason: `Retake available (${attemptCount}/${MAX_ATTEMPTS} attempts used)`,
    attemptsUsed: attemptCount,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt,
    previousScore: firstAttempt.score,
  };
}

/**
 * Calculate final interview result from all attempts
 */
export function calculateFinalResult(
  attempts: InterviewAttempt[]
): InterviewResult {
  if (attempts.length === 0) {
    throw new Error('Cannot calculate result with no attempts');
  }

  // Sort by score descending
  const sortedByScore = [...attempts].sort((a, b) => b.score - a.score);
  const bestAttempt = sortedByScore[0];

  if (!bestAttempt) {
    throw new Error('No best attempt found');
  }

  // Sort by completion time to determine attempt order
  const sortedByTime = [...attempts].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
  );

  const firstAttempt = sortedByTime[0];
  if (!firstAttempt) {
    throw new Error('No first attempt found');
  }

  const attemptUsed = bestAttempt.sessionId === firstAttempt.sessionId ? 1 : 2;

  const improvedScore = attempts.length > 1 && attemptUsed === 2;
  const improvement = improvedScore
    ? bestAttempt.score - firstAttempt.score
    : undefined;

  return {
    finalScore: bestAttempt.score,
    attemptUsed: attemptUsed as 1 | 2,
    allAttempts: sortedByTime,
    improvedScore,
    improvement,
  };
}

/**
 * Get time remaining for retake window
 */
export function getRetakeTimeRemaining(firstAttemptCompletedAt: Date): {
  expired: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  expiresAt: Date;
} {
  const expiresAt = new Date(
    firstAttemptCompletedAt.getTime() + RETAKE_WINDOW_HOURS * 60 * 60 * 1000
  );
  const now = new Date();
  const msRemaining = expiresAt.getTime() - now.getTime();

  if (msRemaining <= 0) {
    return {
      expired: true,
      hoursRemaining: 0,
      minutesRemaining: 0,
      expiresAt,
    };
  }

  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor(
    (msRemaining % (1000 * 60 * 60)) / (1000 * 60)
  );

  return {
    expired: false,
    hoursRemaining,
    minutesRemaining,
    expiresAt,
  };
}

/**
 * Format retake eligibility message for UI
 */
export function formatRetakeMessage(eligibility: RetakeEligibility): string {
  if (eligibility.eligible) {
    if (eligibility.attemptsUsed === 0) {
      return 'Ready to start your interview';
    }
    return `You have one retake available until ${eligibility.expiresAt?.toLocaleString()}`;
  }

  if (eligibility.attemptsUsed >= MAX_ATTEMPTS) {
    return 'Interview completed. Maximum attempts used.';
  }

  return `Retake window expired. You completed your first interview on ${eligibility.expiresAt?.toLocaleString()}.`;
}

/**
 * Validate attempt before starting interview
 */
export function validateAttemptStart(
  applicationId: string,
  attempts: InterviewAttempt[]
): {
  canStart: boolean;
  message: string;
  eligibility: RetakeEligibility;
} {
  const eligibility = checkRetakeEligibility(applicationId, attempts);

  if (!eligibility.eligible) {
    return {
      canStart: false,
      message: formatRetakeMessage(eligibility),
      eligibility,
    };
  }

  return {
    canStart: true,
    message: eligibility.reason,
    eligibility,
  };
}

/**
 * Store attempt data (to be persisted in database)
 */
export interface StoredInterviewData {
  applicationId: string;
  interviewAttemptCount: number;
  interviewSessionIds: string[];
  finalInterviewSessionId?: string;
  finalScore?: number;
  retakeAvailableUntil?: Date;
  allAttempts: InterviewAttempt[];
}

/**
 * Update stored interview data after attempt completion
 */
export function updateStoredData(
  currentData: Partial<StoredInterviewData>,
  newAttempt: InterviewAttempt
): StoredInterviewData {
  const allAttempts = [...(currentData.allAttempts || []), newAttempt];
  const attemptCount = allAttempts.length;

  // Calculate final result
  const result = calculateFinalResult(allAttempts);

  // Set retake availability if first attempt
  let retakeAvailableUntil: Date | undefined;
  if (attemptCount === 1) {
    retakeAvailableUntil = new Date(
      newAttempt.completedAt.getTime() + RETAKE_WINDOW_HOURS * 60 * 60 * 1000
    );
  } else {
    retakeAvailableUntil = currentData.retakeAvailableUntil;
  }

  return {
    applicationId: newAttempt.applicationId,
    interviewAttemptCount: attemptCount,
    interviewSessionIds: allAttempts.map(a => a.sessionId),
    finalInterviewSessionId:
      result.allAttempts[result.attemptUsed - 1]?.sessionId ??
      newAttempt.sessionId,
    finalScore: result.finalScore,
    retakeAvailableUntil,
    allAttempts,
  };
}

/**
 * Generate retake UI message with score comparison
 */
export function getRetakeUIMessage(attempts: InterviewAttempt[]): {
  message: string;
  showRetakeButton: boolean;
  scoreComparison?: {
    previous: number;
    current: number;
    improved: boolean;
    difference: number;
  };
} {
  if (attempts.length === 0) {
    return {
      message: 'Ready to start your interview',
      showRetakeButton: false,
    };
  }

  const firstAttempt = attempts[0];
  if (!firstAttempt) {
    throw new Error('First attempt not found');
  }

  const eligibility = checkRetakeEligibility(
    firstAttempt.applicationId,
    attempts
  );

  if (attempts.length === 1) {
    if (eligibility.eligible) {
      const timeRemaining = getRetakeTimeRemaining(firstAttempt.completedAt);
      return {
        message: `Interview completed! Score: ${firstAttempt.score}/100. You have ${timeRemaining.hoursRemaining}h ${timeRemaining.minutesRemaining}m to retake if desired.`,
        showRetakeButton: true,
      };
    }
    return {
      message: `Interview completed. Score: ${firstAttempt.score}/100. Retake window expired.`,
      showRetakeButton: false,
    };
  }

  // Two attempts - show comparison
  const result = calculateFinalResult(attempts);
  const sortedByTime = [...attempts].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
  );

  const firstAttemptTime = sortedByTime[0];
  const secondAttemptTime = sortedByTime[1];

  if (!firstAttemptTime || !secondAttemptTime) {
    throw new Error('Incomplete attempt data for comparison');
  }

  const scoreComparison = {
    previous: firstAttemptTime.score,
    current: secondAttemptTime.score,
    improved: secondAttemptTime.score > firstAttemptTime.score,
    difference: secondAttemptTime.score - firstAttemptTime.score,
  };

  const improvementText = scoreComparison.improved
    ? `improved by ${scoreComparison.difference} points`
    : scoreComparison.difference < 0
      ? `decreased by ${Math.abs(scoreComparison.difference)} points`
      : 'remained the same';

  return {
    message: `Interview retake completed! First attempt: ${scoreComparison.previous}/100, Second attempt: ${scoreComparison.current}/100. You ${improvementText}. Final score: ${result.finalScore}/100.`,
    showRetakeButton: false,
    scoreComparison,
  };
}

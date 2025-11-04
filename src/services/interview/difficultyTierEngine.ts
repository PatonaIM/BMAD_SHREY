/**
 * Difficulty Tier Engine for Adaptive AI Interviews
 *
 * Dynamically adjusts interview difficulty (tiers 1-5) based on candidate responses.
 * Escalates after 2 strong answers, downgrades after weak + borderline pair.
 *
 * EP3-S4: Real-time AI Interview Interface - Adaptive Questioning
 */

export type DifficultyTier = 1 | 2 | 3 | 4 | 5;

export type ResponseQuality = 'weak' | 'borderline' | 'strong';

export interface ResponseEvaluation {
  quality: ResponseQuality;
  clarity: number; // 0-1 (how clear/structured the answer was)
  correctness: number; // 0-1 (technical accuracy)
  confidence: number; // 0-1 (delivery confidence)
  timestamp: Date;
  reasoning?: string; // Why this quality was assigned
}

export interface DifficultyTierState {
  currentTier: DifficultyTier;
  recentEvaluations: ResponseEvaluation[]; // Last 2-3 evaluations
  tierHistory: Array<{
    tier: DifficultyTier;
    timestamp: Date;
    reason: string;
  }>;
  totalEscalations: number;
  totalDowngrades: number;
}

/**
 * Evaluate response quality based on clarity, correctness, and confidence
 */
export function evaluateResponse(
  clarity: number,
  correctness: number,
  confidence: number,
  reasoning?: string
): ResponseEvaluation {
  // Weighted average: 40% correctness, 30% clarity, 30% confidence
  const overallScore = correctness * 0.4 + clarity * 0.3 + confidence * 0.3;

  let quality: ResponseQuality;
  if (overallScore >= 0.7) {
    quality = 'strong';
  } else if (overallScore >= 0.5) {
    quality = 'borderline';
  } else {
    quality = 'weak';
  }

  return {
    quality,
    clarity,
    correctness,
    confidence,
    timestamp: new Date(),
    reasoning,
  };
}

/**
 * Initialize difficulty tier state
 */
export function initializeDifficultyTier(
  startingTier: DifficultyTier = 2
): DifficultyTierState {
  return {
    currentTier: startingTier,
    recentEvaluations: [],
    tierHistory: [
      {
        tier: startingTier,
        timestamp: new Date(),
        reason: 'Initial tier based on candidate profile',
      },
    ],
    totalEscalations: 0,
    totalDowngrades: 0,
  };
}

/**
 * Determine if tier should change based on recent evaluations
 */
export function shouldAdjustTier(recentEvaluations: ResponseEvaluation[]): {
  shouldChange: boolean;
  direction: 'escalate' | 'downgrade' | null;
  reason: string;
} {
  if (recentEvaluations.length < 2) {
    return {
      shouldChange: false,
      direction: null,
      reason: 'Need at least 2 evaluations',
    };
  }

  const last2 = recentEvaluations.slice(-2);

  // Escalate: 2 strong answers in a row
  if (last2.every(e => e.quality === 'strong')) {
    return {
      shouldChange: true,
      direction: 'escalate',
      reason: 'Two consecutive strong responses',
    };
  }

  // Downgrade: weak + borderline pair (in any order)
  const hasWeak = last2.some(e => e.quality === 'weak');
  const hasBorderline = last2.some(e => e.quality === 'borderline');

  if (hasWeak && hasBorderline) {
    return {
      shouldChange: true,
      direction: 'downgrade',
      reason: 'Weak and borderline response pair',
    };
  }

  // Downgrade: 2 weak answers in a row
  if (last2.every(e => e.quality === 'weak')) {
    return {
      shouldChange: true,
      direction: 'downgrade',
      reason: 'Two consecutive weak responses',
    };
  }

  return {
    shouldChange: false,
    direction: null,
    reason: 'No tier adjustment needed',
  };
}

/**
 * Adjust difficulty tier based on response evaluation
 */
export function adjustDifficultyTier(
  state: DifficultyTierState,
  newEvaluation: ResponseEvaluation
): DifficultyTierState {
  // Add new evaluation
  const updatedEvaluations = [...state.recentEvaluations, newEvaluation].slice(
    -3
  ); // Keep last 3

  // Check if tier should change
  const adjustment = shouldAdjustTier(updatedEvaluations);

  let newTier = state.currentTier;
  let reason = 'No change';

  if (adjustment.shouldChange && adjustment.direction === 'escalate') {
    // Escalate (max tier 5)
    newTier = Math.min(5, state.currentTier + 1) as DifficultyTier;
    reason = adjustment.reason;
  } else if (adjustment.shouldChange && adjustment.direction === 'downgrade') {
    // Downgrade (min tier 1)
    newTier = Math.max(1, state.currentTier - 1) as DifficultyTier;
    reason = adjustment.reason;
  }

  const tierChanged = newTier !== state.currentTier;

  return {
    currentTier: newTier,
    recentEvaluations: updatedEvaluations,
    tierHistory: tierChanged
      ? [
          ...state.tierHistory,
          {
            tier: newTier,
            timestamp: new Date(),
            reason,
          },
        ]
      : state.tierHistory,
    totalEscalations:
      tierChanged && newTier > state.currentTier
        ? state.totalEscalations + 1
        : state.totalEscalations,
    totalDowngrades:
      tierChanged && newTier < state.currentTier
        ? state.totalDowngrades + 1
        : state.totalDowngrades,
  };
}

/**
 * Get question difficulty descriptor for AI prompt
 */
export function getDifficultyDescriptor(tier: DifficultyTier): string {
  const descriptors: Record<DifficultyTier, string> = {
    1: 'basic, entry-level question suitable for junior candidates',
    2: 'intermediate question with some depth',
    3: 'solid mid-level question requiring good understanding',
    4: 'advanced question with nuanced concepts',
    5: 'expert-level question requiring deep expertise',
  };

  return descriptors[tier];
}

/**
 * Estimate response quality from heuristics (for real-time use without full AI analysis)
 */
export function estimateResponseQuality(params: {
  responseDuration: number; // seconds
  averageConfidence: number; // 0-1 from speech analysis
  hasStructure: boolean; // Does it have intro/body/conclusion?
  keywordMatches: number; // How many relevant technical terms?
  fillerWordRatio: number; // 0-1 (um, uh, like, etc.)
}): ResponseEvaluation {
  const {
    responseDuration,
    averageConfidence,
    hasStructure,
    keywordMatches,
    fillerWordRatio,
  } = params;

  // Clarity heuristics
  let clarity = 0.5;
  if (hasStructure) clarity += 0.2;
  if (responseDuration >= 20 && responseDuration <= 120) clarity += 0.15; // Good length
  if (fillerWordRatio < 0.1) clarity += 0.15; // Low filler words

  clarity = Math.min(1, Math.max(0, clarity));

  // Correctness heuristics (rough estimate)
  let correctness = 0.5;
  if (keywordMatches >= 3) correctness += 0.2;
  if (keywordMatches >= 5) correctness += 0.15;
  if (responseDuration >= 30) correctness += 0.15; // Detailed answer

  correctness = Math.min(1, Math.max(0, correctness));

  // Confidence is direct input
  const confidence = Math.min(1, Math.max(0, averageConfidence));

  return evaluateResponse(
    clarity,
    correctness,
    confidence,
    'Heuristic-based estimation'
  );
}

/**
 * Get difficulty tier recommendations based on interview progress
 */
export function getProgressBasedRecommendation(
  currentTier: DifficultyTier,
  questionsAsked: number,
  totalQuestions: number
): {
  suggestedTier: DifficultyTier;
  reason: string;
} {
  const progress = questionsAsked / totalQuestions;

  // Start easier, ramp up in middle, stabilize at end
  if (progress < 0.3 && currentTier < 3) {
    return {
      suggestedTier: 2 as DifficultyTier,
      reason: 'Early interview - use moderate difficulty',
    };
  }

  if (progress >= 0.3 && progress < 0.7 && currentTier < 4) {
    return {
      suggestedTier: 3 as DifficultyTier,
      reason: 'Mid-interview - increase difficulty',
    };
  }

  if (progress >= 0.7) {
    return {
      suggestedTier: currentTier,
      reason: 'Late interview - maintain current difficulty',
    };
  }

  return {
    suggestedTier: currentTier,
    reason: 'No adjustment needed',
  };
}

/**
 * Export tier state for analytics
 */
export function exportTierAnalytics(state: DifficultyTierState): {
  finalTier: DifficultyTier;
  startingTier: DifficultyTier;
  totalEscalations: number;
  totalDowngrades: number;
  averageQuality: ResponseQuality | null;
  tierProgression: Array<{ tier: number; timestamp: string; reason: string }>;
} {
  const startingTier = state.tierHistory[0]?.tier ?? 2;

  // Calculate average quality
  let averageQuality: ResponseQuality | null = null;
  if (state.recentEvaluations.length > 0) {
    const strongCount = state.recentEvaluations.filter(
      e => e.quality === 'strong'
    ).length;
    const weakCount = state.recentEvaluations.filter(
      e => e.quality === 'weak'
    ).length;

    if (strongCount > weakCount) {
      averageQuality = 'strong';
    } else if (weakCount > strongCount) {
      averageQuality = 'weak';
    } else {
      averageQuality = 'borderline';
    }
  }

  return {
    finalTier: state.currentTier,
    startingTier,
    totalEscalations: state.totalEscalations,
    totalDowngrades: state.totalDowngrades,
    averageQuality,
    tierProgression: state.tierHistory.map(h => ({
      tier: h.tier,
      timestamp: h.timestamp.toISOString(),
      reason: h.reason,
    })),
  };
}

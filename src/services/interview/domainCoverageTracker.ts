/**
 * Domain Coverage Tracker for Adaptive AI Interviews
 *
 * Ensures balanced question distribution across domains:
 * - Technical (≥3 questions)
 * - Behavioral (≥1 question)
 * - Architecture (≥1 question)
 * - Problem-solving
 * - Communication
 *
 * EP3-S4: Real-time AI Interview Interface - Domain Rotation
 */

export type QuestionDomain =
  | 'technical'
  | 'behavioral'
  | 'architecture'
  | 'problem-solving'
  | 'communication';

export interface DomainRequirement {
  domain: QuestionDomain;
  minimum: number; // Minimum questions required
  target: number; // Ideal number of questions
  current: number; // Questions asked so far
  questionIds: string[]; // Track which questions covered this domain
}

export interface DomainCoverageState {
  requirements: DomainRequirement[];
  totalQuestionsAsked: number;
  lastDomain: QuestionDomain | null;
  domainSequence: QuestionDomain[]; // Track order of domains asked
}

/**
 * Initialize domain coverage with minimum requirements
 */
export function initializeDomainCoverage(): DomainCoverageState {
  return {
    requirements: [
      {
        domain: 'technical',
        minimum: 3,
        target: 5,
        current: 0,
        questionIds: [],
      },
      {
        domain: 'behavioral',
        minimum: 1,
        target: 2,
        current: 0,
        questionIds: [],
      },
      {
        domain: 'architecture',
        minimum: 1,
        target: 2,
        current: 0,
        questionIds: [],
      },
      {
        domain: 'problem-solving',
        minimum: 0,
        target: 2,
        current: 0,
        questionIds: [],
      },
      {
        domain: 'communication',
        minimum: 0,
        target: 1,
        current: 0,
        questionIds: [],
      },
    ],
    totalQuestionsAsked: 0,
    lastDomain: null,
    domainSequence: [],
  };
}

/**
 * Record that a question was asked in a specific domain
 */
export function recordDomainQuestion(
  state: DomainCoverageState,
  domain: QuestionDomain,
  questionId: string
): DomainCoverageState {
  const updatedRequirements = state.requirements.map(req => {
    if (req.domain === domain) {
      return {
        ...req,
        current: req.current + 1,
        questionIds: [...req.questionIds, questionId],
      };
    }
    return req;
  });

  return {
    requirements: updatedRequirements,
    totalQuestionsAsked: state.totalQuestionsAsked + 1,
    lastDomain: domain,
    domainSequence: [...state.domainSequence, domain],
  };
}

/**
 * Check if minimum coverage requirements are met
 */
export function isMinimumCoverageMet(state: DomainCoverageState): {
  isMet: boolean;
  unmetDomains: QuestionDomain[];
  summary: string;
} {
  const unmetDomains: QuestionDomain[] = [];

  for (const req of state.requirements) {
    if (req.current < req.minimum) {
      unmetDomains.push(req.domain);
    }
  }

  const isMet = unmetDomains.length === 0;

  const summary = isMet
    ? 'All minimum domain requirements met'
    : `Missing coverage: ${unmetDomains.join(', ')}`;

  return {
    isMet,
    unmetDomains,
    summary,
  };
}

/**
 * Check if target coverage is achieved (ideal)
 */
export function isTargetCoverageAchieved(state: DomainCoverageState): {
  isAchieved: boolean;
  remainingTargets: Array<{
    domain: QuestionDomain;
    needed: number;
  }>;
} {
  const remainingTargets: Array<{
    domain: QuestionDomain;
    needed: number;
  }> = [];

  for (const req of state.requirements) {
    if (req.current < req.target) {
      remainingTargets.push({
        domain: req.domain,
        needed: req.target - req.current,
      });
    }
  }

  return {
    isAchieved: remainingTargets.length === 0,
    remainingTargets,
  };
}

/**
 * Get next domain to ask based on coverage needs and rotation logic
 */
export function getNextDomain(
  state: DomainCoverageState,
  avoidConsecutive: boolean = true
): {
  domain: QuestionDomain;
  reason: string;
  priority: 'required' | 'recommended' | 'filler';
} {
  // First priority: domains not meeting minimum requirements
  for (const req of state.requirements) {
    if (req.current < req.minimum) {
      // Avoid asking same domain consecutively if possible
      if (avoidConsecutive && state.lastDomain === req.domain) {
        // Check if there's another minimum-requirement domain
        const otherRequiredDomain = state.requirements.find(
          r => r.current < r.minimum && r.domain !== req.domain
        );
        if (otherRequiredDomain) {
          return {
            domain: otherRequiredDomain.domain,
            reason: `Required domain: ${otherRequiredDomain.domain} (${otherRequiredDomain.current}/${otherRequiredDomain.minimum})`,
            priority: 'required',
          };
        }
      }

      return {
        domain: req.domain,
        reason: `Required domain: ${req.domain} (${req.current}/${req.minimum})`,
        priority: 'required',
      };
    }
  }

  // Second priority: domains not meeting target
  for (const req of state.requirements) {
    if (req.current < req.target) {
      // Avoid consecutive same domain
      if (avoidConsecutive && state.lastDomain === req.domain) {
        continue;
      }

      return {
        domain: req.domain,
        reason: `Target domain: ${req.domain} (${req.current}/${req.target})`,
        priority: 'recommended',
      };
    }
  }

  // Fallback: rotate through domains, avoiding last one
  const availableDomains = state.requirements
    .filter(req => req.domain !== state.lastDomain)
    .map(req => req.domain);

  const selectedDomain =
    availableDomains[Math.floor(Math.random() * availableDomains.length)] ||
    'technical';

  return {
    domain: selectedDomain,
    reason: 'Filler question - all targets met',
    priority: 'filler',
  };
}

/**
 * Get coverage progress as percentage
 */
export function getCoverageProgress(state: DomainCoverageState): {
  minimumProgress: number; // 0-1
  targetProgress: number; // 0-1
  domainBreakdown: Array<{
    domain: QuestionDomain;
    minimumMet: boolean;
    targetMet: boolean;
    percentage: number;
  }>;
} {
  const domainBreakdown = state.requirements.map(req => {
    const minimumMet = req.current >= req.minimum;
    const targetMet = req.current >= req.target;
    const percentage = req.target > 0 ? req.current / req.target : 1;

    return {
      domain: req.domain,
      minimumMet,
      targetMet,
      percentage: Math.min(1, percentage),
    };
  });

  // Calculate minimum progress
  const totalMinimum = state.requirements.reduce(
    (sum, req) => sum + req.minimum,
    0
  );
  const metMinimum = state.requirements.reduce(
    (sum, req) => sum + Math.min(req.current, req.minimum),
    0
  );
  const minimumProgress = totalMinimum > 0 ? metMinimum / totalMinimum : 1;

  // Calculate target progress
  const totalTarget = state.requirements.reduce(
    (sum, req) => sum + req.target,
    0
  );
  const metTarget = state.requirements.reduce(
    (sum, req) => sum + Math.min(req.current, req.target),
    0
  );
  const targetProgress = totalTarget > 0 ? metTarget / totalTarget : 1;

  return {
    minimumProgress,
    targetProgress,
    domainBreakdown,
  };
}

/**
 * Check if interview can end based on coverage and time
 */
export function canEndInterview(
  state: DomainCoverageState,
  elapsedMinutes: number,
  minQuestions: number = 5
): {
  canEnd: boolean;
  reason: string;
  forceEnd: boolean; // Force end if time limit exceeded
} {
  // Force end after 15 minutes
  if (elapsedMinutes >= 15) {
    return {
      canEnd: true,
      reason: 'Time limit reached (15 minutes)',
      forceEnd: true,
    };
  }

  // Check minimum questions asked
  if (state.totalQuestionsAsked < minQuestions) {
    return {
      canEnd: false,
      reason: `Need ${minQuestions - state.totalQuestionsAsked} more questions`,
      forceEnd: false,
    };
  }

  // Check minimum coverage
  const coverage = isMinimumCoverageMet(state);
  if (!coverage.isMet) {
    return {
      canEnd: false,
      reason: coverage.summary,
      forceEnd: false,
    };
  }

  // Allow early end if targets met and at least 10 minutes elapsed
  const targetCoverage = isTargetCoverageAchieved(state);
  if (targetCoverage.isAchieved && elapsedMinutes >= 10) {
    return {
      canEnd: true,
      reason: 'All targets achieved, minimum time met',
      forceEnd: false,
    };
  }

  // Allow end if minimum met and approaching time limit
  if (coverage.isMet && elapsedMinutes >= 12) {
    return {
      canEnd: true,
      reason: 'Minimum coverage met, approaching time limit',
      forceEnd: false,
    };
  }

  return {
    canEnd: false,
    reason: 'Continue to reach target coverage',
    forceEnd: false,
  };
}

/**
 * Export coverage analytics
 */
export function exportCoverageAnalytics(state: DomainCoverageState): {
  totalQuestions: number;
  domainDistribution: Record<QuestionDomain, number>;
  minimumCoverageMet: boolean;
  targetCoverageAchieved: boolean;
  domainSequence: QuestionDomain[];
  coveragePercentage: number;
} {
  const minimumCoverage = isMinimumCoverageMet(state);
  const targetCoverage = isTargetCoverageAchieved(state);
  const progress = getCoverageProgress(state);

  const domainDistribution: Record<QuestionDomain, number> = {
    technical: 0,
    behavioral: 0,
    architecture: 0,
    'problem-solving': 0,
    communication: 0,
  };

  for (const req of state.requirements) {
    domainDistribution[req.domain] = req.current;
  }

  return {
    totalQuestions: state.totalQuestionsAsked,
    domainDistribution,
    minimumCoverageMet: minimumCoverage.isMet,
    targetCoverageAchieved: targetCoverage.isAchieved,
    domainSequence: state.domainSequence,
    coveragePercentage: progress.targetProgress,
  };
}

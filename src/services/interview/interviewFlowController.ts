/**
 * Interview Flow Controller
 *
 * Orchestrates adaptive AI interview sessions by integrating:
 * - Difficulty tier adjustment (difficultyTierEngine)
 * - Domain coverage tracking (domainCoverageTracker)
 * - Provider masking (providerMaskingFilter)
 * - Question selection and progression
 *
 * EP3-S4: Real-time AI Interview Interface - Flow Orchestration
 */

import {
  evaluateResponse,
  adjustDifficultyTier,
  getDifficultyDescriptor,
  type ResponseEvaluation,
  type DifficultyTier,
  type DifficultyTierState,
} from './difficultyTierEngine';

import {
  initializeDomainCoverage,
  recordDomainQuestion,
  isMinimumCoverageMet,
  getNextDomain,
  canEndInterview,
  type QuestionDomain,
  type DomainCoverageState,
} from './domainCoverageTracker';

import {
  filterAIResponse,
  generateMaskedSystemPrompt,
  ProviderMaskingMonitor,
  type MaskingViolation,
} from './providerMaskingFilter';

/**
 * Interview question structure
 */
export interface InterviewQuestion {
  id: string;
  domain: QuestionDomain;
  tier: DifficultyTier;
  questionText: string;
  context?: string; // Why this question was selected
  expectedKeyPoints?: string[]; // For response evaluation
  followUpQuestions?: string[]; // Optional follow-ups
}

/**
 * Candidate response tracking
 */
export interface CandidateResponse {
  questionId: string;
  responseText: string;
  audioUrl?: string;
  timestamp: Date;
  duration: number; // seconds
  evaluation: ResponseEvaluation;
  aiAcknowledgment?: string; // AI's brief response
  coachingSignals?: string[]; // From Gemini Live
}

/**
 * Interview session state
 */
export interface InterviewSession {
  sessionId: string;
  applicationId: string;
  candidateId: string;
  jobTitle: string;
  companyName: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'preparing' | 'active' | 'completed' | 'aborted';
  difficultyState: DifficultyTierState;
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
  domainCoverageState: DomainCoverageState;
  maskingMonitor: ProviderMaskingMonitor;
  currentQuestionIndex: number;
  targetDuration: number; // minutes
}

/**
 * Interview summary results
 */
export interface InterviewSummary {
  sessionId: string;
  totalQuestions: number;
  questionsAnswered: number;
  duration: number; // seconds
  averageScore: number;
  finalTier: DifficultyTier;
  domainCoverage: Record<QuestionDomain, number>;
  coverageMet: boolean;
  maskingViolations: MaskingViolation[];
  responses: CandidateResponse[];
  recommendedScoreBoost: number; // 0-15 points
}

/**
 * Question bank by domain and tier
 */
interface QuestionBank {
  [domain: string]: {
    [tier: number]: InterviewQuestion[];
  };
}

/**
 * Generate system prompt for OpenAI Realtime API
 */
export function generateInterviewSystemPrompt(params: {
  jobTitle: string;
  companyName: string;
  candidateName: string;
  jobDescription: string;
  targetDuration: number;
}): string {
  return generateMaskedSystemPrompt({
    ...params,
    interviewDuration: params.targetDuration,
  });
}

/**
 * Initialize interview session
 */
export function initializeInterviewSession(params: {
  sessionId: string;
  applicationId: string;
  candidateId: string;
  jobTitle: string;
  companyName: string;
  targetDuration?: number;
}): InterviewSession {
  return {
    sessionId: params.sessionId,
    applicationId: params.applicationId,
    candidateId: params.candidateId,
    jobTitle: params.jobTitle,
    companyName: params.companyName,
    startedAt: new Date(),
    status: 'preparing',
    difficultyState: {
      currentTier: 3,
      recentEvaluations: [],
      tierHistory: [],
      totalEscalations: 0,
      totalDowngrades: 0,
    },
    questions: [],
    responses: [],
    domainCoverageState: initializeDomainCoverage(),
    maskingMonitor: new ProviderMaskingMonitor(),
    currentQuestionIndex: 0,
    targetDuration: params.targetDuration || 15,
  };
}

/**
 * Select next question based on current tier and domain coverage
 */
export function selectNextQuestion(
  session: InterviewSession,
  questionBank: QuestionBank
): InterviewQuestion | null {
  // Check if interview should end
  const elapsedMinutes = (Date.now() - session.startedAt.getTime()) / 1000 / 60;

  // Calculate average quality score from evaluations
  const avgQualityScore =
    session.responses.length > 0
      ? session.responses.reduce((sum, r) => {
          const qualityMap = { weak: 0.3, borderline: 0.6, strong: 0.9 };
          return sum + (qualityMap[r.evaluation.quality] || 0.6);
        }, 0) / session.responses.length
      : 0.6;

  if (
    canEndInterview(
      session.domainCoverageState,
      elapsedMinutes,
      avgQualityScore
    ) ||
    elapsedMinutes >= session.targetDuration
  ) {
    return null; // Interview complete
  }

  // Get recommended domain
  const nextDomainResult = getNextDomain(session.domainCoverageState);
  const nextDomain = nextDomainResult.domain;
  const currentTier = session.difficultyState.currentTier;

  // Find questions for this domain and tier
  const availableQuestions = questionBank[nextDomain]?.[currentTier] || [];

  // Filter out already asked questions
  const askedQuestionIds = new Set(session.questions.map(q => q.id));
  const unansweredQuestions = availableQuestions.filter(
    (q: InterviewQuestion) => !askedQuestionIds.has(q.id)
  );

  if (unansweredQuestions.length === 0) {
    // Try adjacent tiers if no questions available
    const adjacentTiers = [currentTier - 1, currentTier + 1].filter(
      t => t >= 1 && t <= 5
    );

    for (const tier of adjacentTiers) {
      const adjacentQuestions = questionBank[nextDomain]?.[tier] || [];
      const availableAdjacent = adjacentQuestions.filter(
        (q: InterviewQuestion) => !askedQuestionIds.has(q.id)
      );

      if (availableAdjacent.length > 0) {
        return availableAdjacent[0] || null;
      }
    }

    // No questions available for this domain, try another
    return null;
  }

  return unansweredQuestions[0] || null;
}

/**
 * Process candidate response and update session state
 */
export function processResponse(
  session: InterviewSession,
  response: {
    questionId: string;
    responseText: string;
    audioUrl?: string;
    duration: number;
  }
): {
  evaluation: ResponseEvaluation;
  shouldAdjustTier: boolean;
  newTier?: DifficultyTier;
  aiAcknowledgment: string;
  filteredAcknowledgment: string;
} {
  const question = session.questions.find(q => q.id === response.questionId);
  if (!question) {
    throw new Error(`Question ${response.questionId} not found in session`);
  }

  // Evaluate response - use placeholder values for now
  // TODO: Integrate actual transcript analysis
  const wordCount = response.responseText.split(/\s+/).length;
  const clarity = wordCount > 20 && wordCount < 300 ? 0.7 : 0.5;
  const correctness = 0.7; // Would need domain-specific analysis
  const confidence = 0.7; // Would need speech pattern analysis

  const evaluation = evaluateResponse(clarity, correctness, confidence);

  // Store response with evaluation
  const candidateResponse: CandidateResponse = {
    questionId: response.questionId,
    responseText: response.responseText,
    audioUrl: response.audioUrl,
    timestamp: new Date(),
    duration: response.duration,
    evaluation,
  };

  session.responses.push(candidateResponse);

  // Update domain coverage
  session.domainCoverageState = recordDomainQuestion(
    session.domainCoverageState,
    question.domain,
    question.id
  );

  // Check if difficulty should adjust
  const newDifficultyState = adjustDifficultyTier(
    session.difficultyState,
    evaluation
  );

  const shouldAdjustTier =
    newDifficultyState.currentTier !== session.difficultyState.currentTier;
  const newTier = shouldAdjustTier ? newDifficultyState.currentTier : undefined;

  if (shouldAdjustTier) {
    session.difficultyState = newDifficultyState;
  }

  // Generate AI acknowledgment (brief, 3-5 words)
  // Use quality score as proxy for overall score
  const qualityMap = { weak: 40, borderline: 70, strong: 90 };
  const overallScore = qualityMap[evaluation.quality] || 70;
  const aiAcknowledgment = generateBriefAcknowledgment(overallScore);

  // Apply provider masking to acknowledgment
  const maskingResult = filterAIResponse(aiAcknowledgment);

  return {
    evaluation,
    shouldAdjustTier,
    newTier,
    aiAcknowledgment,
    filteredAcknowledgment: maskingResult.filtered,
  };
}

/**
 * Generate brief AI acknowledgment (3-5 words)
 */
function generateBriefAcknowledgment(score: number): string {
  if (score >= 80) {
    const responses = ['Great answer!', 'Excellent point.', 'Well explained.'];
    return (
      responses[Math.floor(Math.random() * responses.length)] || 'Great answer!'
    );
  }

  if (score >= 60) {
    const responses = ['Got it, thanks.', 'I see.', 'Understood.'];
    return (
      responses[Math.floor(Math.random() * responses.length)] ||
      'Got it, thanks.'
    );
  }

  const responses = ['Okay, thank you.', 'I understand.', 'Noted.'];
  return (
    responses[Math.floor(Math.random() * responses.length)] ||
    'Okay, thank you.'
  );
}

/**
 * Check if interview should end
 */
export function shouldEndInterview(session: InterviewSession): {
  shouldEnd: boolean;
  reason?: string;
} {
  const elapsedMinutes = (Date.now() - session.startedAt.getTime()) / 1000 / 60;

  // Calculate average quality score
  const avgQualityScore =
    session.responses.length > 0
      ? session.responses.reduce((sum, r) => {
          const qualityMap = { weak: 0.3, borderline: 0.6, strong: 0.9 };
          return sum + (qualityMap[r.evaluation.quality] || 0.6);
        }, 0) / session.responses.length
      : 0.6;

  // Time limit reached
  if (elapsedMinutes >= session.targetDuration) {
    return {
      shouldEnd: true,
      reason: 'Time limit reached',
    };
  }

  // Coverage and quality satisfied
  if (
    canEndInterview(
      session.domainCoverageState,
      elapsedMinutes,
      avgQualityScore
    )
  ) {
    return {
      shouldEnd: true,
      reason: 'Coverage requirements met with sufficient quality',
    };
  }

  return { shouldEnd: false };
}

/**
 * Generate interview summary
 */
export function generateInterviewSummary(
  session: InterviewSession
): InterviewSummary {
  const duration = session.endedAt
    ? (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
    : 0;

  // Calculate average quality score
  const avgQualityScore =
    session.responses.length > 0
      ? session.responses.reduce((sum, r) => {
          const qualityMap = { weak: 0.3, borderline: 0.6, strong: 0.9 };
          return sum + (qualityMap[r.evaluation.quality] || 0.6);
        }, 0) / session.responses.length
      : 0.6;

  // Convert to percentage for display
  const avgScore = avgQualityScore * 100;

  // Get domain coverage
  const domainCoverage: Record<QuestionDomain, number> = {
    technical:
      session.domainCoverageState.requirements.find(
        r => r.domain === 'technical'
      )?.current || 0,
    behavioral:
      session.domainCoverageState.requirements.find(
        r => r.domain === 'behavioral'
      )?.current || 0,
    architecture:
      session.domainCoverageState.requirements.find(
        r => r.domain === 'architecture'
      )?.current || 0,
    'problem-solving': 0,
    communication: 0,
  };

  const coverageMet = isMinimumCoverageMet(session.domainCoverageState);

  // Calculate score boost (0-15 points based on performance)
  const recommendedScoreBoost = calculateScoreBoost(
    avgScore,
    session.difficultyState.currentTier,
    coverageMet.isMet
  );

  return {
    sessionId: session.sessionId,
    totalQuestions: session.questions.length,
    questionsAnswered: session.responses.length,
    duration,
    averageScore: avgScore,
    finalTier: session.difficultyState.currentTier,
    domainCoverage,
    coverageMet: coverageMet.isMet,
    maskingViolations: session.maskingMonitor.getViolations(),
    responses: session.responses,
    recommendedScoreBoost,
  };
}

/**
 * Calculate score boost based on performance
 */
function calculateScoreBoost(
  avgScore: number,
  finalTier: DifficultyTier,
  coverageMet: boolean
): number {
  if (!coverageMet) {
    return 0; // No boost if minimum coverage not met
  }

  // Base boost on average score
  let boost = 0;

  if (avgScore >= 85) {
    boost = 15; // Excellent performance
  } else if (avgScore >= 75) {
    boost = 12;
  } else if (avgScore >= 65) {
    boost = 9;
  } else if (avgScore >= 55) {
    boost = 6;
  } else {
    boost = 3; // Minimal boost for completion
  }

  // Tier bonus (higher tiers get slight bonus)
  const tierBonus = Math.max(0, (finalTier - 3) * 1); // +1 per tier above 3
  boost += tierBonus;

  // Cap at 15
  return Math.min(15, boost);
}

/**
 * Apply provider masking to AI response
 */
export function maskAIResponse(
  text: string,
  userQuestion: string | undefined,
  monitor: ProviderMaskingMonitor
): string {
  const result = monitor.checkResponse(text, userQuestion);
  return result.filtered;
}

/**
 * Get interview state for UI
 */
export function getInterviewState(session: InterviewSession): {
  currentQuestion?: InterviewQuestion;
  currentTier: DifficultyTier;
  tierDescription: string;
  questionsAnswered: number;
  totalQuestions: number;
  elapsedMinutes: number;
  estimatedRemainingMinutes: number;
  coverageProgress: {
    technical: number;
    behavioral: number;
    architecture: number;
  };
  coverageMet: boolean;
} {
  const currentQuestion =
    session.currentQuestionIndex < session.questions.length
      ? session.questions[session.currentQuestionIndex]
      : undefined;

  const elapsedMinutes = (Date.now() - session.startedAt.getTime()) / 1000 / 60;
  const estimatedRemainingMinutes = Math.max(
    0,
    session.targetDuration - elapsedMinutes
  );

  return {
    currentQuestion,
    currentTier: session.difficultyState.currentTier,
    tierDescription: getDifficultyDescriptor(
      session.difficultyState.currentTier
    ),
    questionsAnswered: session.responses.length,
    totalQuestions: session.questions.length,
    elapsedMinutes,
    estimatedRemainingMinutes,
    coverageProgress: {
      technical:
        session.domainCoverageState.requirements.find(
          r => r.domain === 'technical'
        )?.current || 0,
      behavioral:
        session.domainCoverageState.requirements.find(
          r => r.domain === 'behavioral'
        )?.current || 0,
      architecture:
        session.domainCoverageState.requirements.find(
          r => r.domain === 'architecture'
        )?.current || 0,
    },
    coverageMet: isMinimumCoverageMet(session.domainCoverageState).isMet,
  };
}

import type {
  InterviewQAPair,
  InterviewSession,
} from '../../shared/types/interview';
import { getOpenAI } from '../../ai/openai/client';
import { logger } from '../../monitoring/logger';

/**
 * Interview Scoring Service
 *
 * Analyzes completed interview transcripts to generate performance scores.
 * Weighting: 60% Technical, 40% Communication
 */

export interface InterviewScores {
  overall: number; // 0-100
  technical: number; // 0-100 - Technical knowledge, problem-solving
  communication: number; // 0-100 - Clarity, articulation, confidence
  experience: number; // 0-100 - Relevant experience demonstrated
  confidence: number; // 0-100 - AI confidence in scoring
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  technicalFactors: {
    depth: number; // Technical depth of answers
    accuracy: number; // Correctness of technical concepts
    problemSolving: number; // Problem-solving approach
  };
  communicationFactors: {
    clarity: number; // Clear and structured responses
    articulation: number; // Well-articulated explanations
    engagement: number; // Active engagement in conversation
  };
  experienceFactors: {
    relevance: number; // Relevance of experience to role
    examples: number; // Quality of examples provided
    impact: number; // Demonstrated impact in past roles
  };
}

export interface ScoringFeedback {
  strengths: string[];
  improvements: string[];
  detailedAnalysis: string;
  recommendations: string[];
}

interface GptScoringResponse {
  technical_score: number;
  communication_score: number;
  experience_score: number;
  confidence_score: number;
  technical_depth: number;
  technical_accuracy: number;
  problem_solving: number;
  clarity: number;
  articulation: number;
  engagement: number;
  experience_relevance: number;
  example_quality: number;
  impact_demonstration: number;
  strengths: string[];
  improvements: string[];
  detailed_analysis: string;
  recommendations: string[];
}

/**
 * Calculate comprehensive interview scores from Q&A transcript
 */
export async function calculateInterviewScores(
  session: InterviewSession,
  jobContext?: {
    title: string;
    description: string;
    requiredSkills: string[];
  }
): Promise<{ scores: InterviewScores; feedback: ScoringFeedback }> {
  try {
    logger.info({
      event: 'interview_scoring_started',
      sessionId: session.sessionId,
      qaCount: session.qaTranscript?.length || 0,
    });

    if (!session.qaTranscript || session.qaTranscript.length === 0) {
      throw new Error('No Q&A transcript available for scoring');
    }

    // Prepare transcript for GPT-4 analysis
    const transcriptText = formatTranscriptForAnalysis(session.qaTranscript);

    // Get OpenAI client
    const openai = await getOpenAI();

    // Generate comprehensive scoring using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: buildScoringSystemPrompt(jobContext),
        },
        {
          role: 'user',
          content: `Analyze this interview transcript and provide detailed scoring:\n\n${transcriptText}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for consistent scoring
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from GPT-4 scoring');
    }

    const gptResponse: GptScoringResponse = JSON.parse(responseContent);

    // Calculate overall score (weighted: 60% technical, 40% communication)
    const technicalScore = gptResponse.technical_score;
    const communicationScore = gptResponse.communication_score;
    const experienceScore = gptResponse.experience_score;
    const overallScore = Math.round(
      technicalScore * 0.6 + communicationScore * 0.4
    );

    const scores: InterviewScores = {
      overall: Math.min(100, Math.max(0, overallScore)),
      technical: Math.min(100, Math.max(0, technicalScore)),
      communication: Math.min(100, Math.max(0, communicationScore)),
      experience: Math.min(100, Math.max(0, experienceScore)),
      confidence: Math.min(100, Math.max(0, gptResponse.confidence_score)),
      breakdown: {
        technicalFactors: {
          depth: gptResponse.technical_depth,
          accuracy: gptResponse.technical_accuracy,
          problemSolving: gptResponse.problem_solving,
        },
        communicationFactors: {
          clarity: gptResponse.clarity,
          articulation: gptResponse.articulation,
          engagement: gptResponse.engagement,
        },
        experienceFactors: {
          relevance: gptResponse.experience_relevance,
          examples: gptResponse.example_quality,
          impact: gptResponse.impact_demonstration,
        },
      },
    };

    const feedback: ScoringFeedback = {
      strengths: gptResponse.strengths || [],
      improvements: gptResponse.improvements || [],
      detailedAnalysis: gptResponse.detailed_analysis || '',
      recommendations: gptResponse.recommendations || [],
    };

    logger.info({
      event: 'interview_scoring_completed',
      sessionId: session.sessionId,
      overallScore: scores.overall,
      technicalScore: scores.technical,
      communicationScore: scores.communication,
    });

    return { scores, feedback };
  } catch (error) {
    logger.error({
      event: 'interview_scoring_failed',
      sessionId: session.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Calculate score boost for application (5-15 points based on performance)
 */
export function calculateScoreBoost(
  interviewScore: number,
  currentMatchScore: number
): number {
  // Score boost range: 5-15 points
  // Better interview performance = higher boost
  const baseBoost = 5;
  const maxAdditionalBoost = 10;

  // Normalize interview score (0-100) to boost factor (0-1)
  const boostFactor = interviewScore / 100;

  // Calculate boost amount
  const boost = baseBoost + maxAdditionalBoost * boostFactor;

  // Apply diminishing returns for already high scores
  const diminishingFactor = currentMatchScore >= 85 ? 0.5 : 1.0;

  const finalBoost = Math.round(boost * diminishingFactor);

  // Ensure final score doesn't exceed 100
  const newScore = currentMatchScore + finalBoost;
  const cappedBoost = newScore > 100 ? 100 - currentMatchScore : finalBoost;

  return Math.max(0, Math.min(15, cappedBoost));
}

/**
 * Format Q&A transcript for GPT-4 analysis
 */
function formatTranscriptForAnalysis(qaTranscript: InterviewQAPair[]): string {
  return qaTranscript
    .map((qa, index) => {
      const duration = qa.answerDuration
        ? `(${Math.round(qa.answerDuration)}s)`
        : '';
      return `
Q${index + 1} [${qa.questionCategory}] ${duration}:
${qa.question}

A${index + 1}:
${qa.answerText || '(No response recorded)'}
`;
    })
    .join('\n---\n');
}

/**
 * Build system prompt for GPT-4 scoring
 */
function buildScoringSystemPrompt(jobContext?: {
  title: string;
  description: string;
  requiredSkills: string[];
}): string {
  const jobContextText = jobContext
    ? `
Job Context:
- Title: ${jobContext.title}
- Required Skills: ${jobContext.requiredSkills.join(', ')}
- Description: ${jobContext.description.substring(0, 500)}
`
    : '';

  return `You are an expert technical interviewer evaluating candidate performance.

${jobContextText}

Analyze the interview transcript and provide comprehensive scoring in JSON format with these exact fields:

{
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "experience_score": <0-100>,
  "confidence_score": <0-100>,
  "technical_depth": <0-100>,
  "technical_accuracy": <0-100>,
  "problem_solving": <0-100>,
  "clarity": <0-100>,
  "articulation": <0-100>,
  "engagement": <0-100>,
  "experience_relevance": <0-100>,
  "example_quality": <0-100>,
  "impact_demonstration": <0-100>,
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["area 1", "area 2", ...],
  "detailed_analysis": "2-3 paragraph analysis",
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}

Scoring Guidelines:

**Technical Score (0-100):**
- Depth of technical knowledge (technical_depth)
- Accuracy of concepts explained (technical_accuracy)
- Problem-solving approach demonstrated (problem_solving)
- Weight: 60% of overall score

**Communication Score (0-100):**
- Clarity of explanations (clarity)
- Articulation and structure (articulation)
- Engagement and enthusiasm (engagement)
- Weight: 40% of overall score

**Experience Score (0-100):**
- Relevance of past experience (experience_relevance)
- Quality of examples provided (example_quality)
- Demonstrated impact (impact_demonstration)

**Confidence Score (0-100):**
- Your confidence in the accuracy of scoring
- Based on completeness of responses and transcript quality

**Strengths:** 3-5 specific positive observations
**Improvements:** 2-4 specific areas for growth
**Detailed Analysis:** Overall assessment covering technical ability, communication style, and cultural fit
**Recommendations:** 3-5 actionable steps for improvement

Be fair but thorough. Consider answer depth, clarity, relevance, and enthusiasm.`;
}

/**
 * Validate scoring response
 */
export function validateScores(scores: InterviewScores): boolean {
  const isInRange = (value: number) => value >= 0 && value <= 100;

  return (
    isInRange(scores.overall) &&
    isInRange(scores.technical) &&
    isInRange(scores.communication) &&
    isInRange(scores.experience) &&
    isInRange(scores.confidence)
  );
}

/**
 * Generate human-readable score summary
 */
export function generateScoreSummary(scores: InterviewScores): string {
  const rating =
    scores.overall >= 85
      ? 'Excellent'
      : scores.overall >= 70
        ? 'Good'
        : scores.overall >= 60
          ? 'Fair'
          : 'Needs Improvement';

  return `${rating} performance (${scores.overall}/100) - Technical: ${scores.technical}, Communication: ${scores.communication}`;
}

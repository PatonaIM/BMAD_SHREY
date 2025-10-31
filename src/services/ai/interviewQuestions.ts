import { getOpenAI } from '../../ai/openai/client';
import type { Job } from '../../shared/types/job';
import type { ExtractedProfile } from '../../shared/types/profile';
import { logger } from '../../monitoring/logger';

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'experience' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedDuration: number; // seconds
  followUpTopics?: string[]; // Topics AI can explore based on response
  scoringCriteria?: string[]; // What to evaluate in the response
}

export interface QuestionGenerationResult {
  questions: InterviewQuestion[];
  totalEstimatedDuration: number; // seconds
  generationMetadata: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUSD: number;
  };
}

export interface QuestionGenerationOptions {
  targetDuration?: number; // Total interview duration in seconds (default: 900 = 15 min)
  minQuestions?: number; // Minimum questions to generate (default: 5)
  maxQuestions?: number; // Maximum questions to generate (default: 8)
  categoryWeights?: {
    technical: number;
    behavioral: number;
    experience: number;
    situational: number;
  };
  includeFollowUps?: boolean; // Generate follow-up topic suggestions (default: true)
}

export class InterviewQuestionGeneratorService {
  private readonly defaultOptions: Required<QuestionGenerationOptions> = {
    targetDuration: 900, // 15 minutes
    minQuestions: 5,
    maxQuestions: 8,
    categoryWeights: {
      technical: 0.4,
      behavioral: 0.25,
      experience: 0.25,
      situational: 0.1,
    },
    includeFollowUps: true,
  };

  /**
   * Generate tailored interview questions based on job requirements and candidate profile
   */
  async generateQuestions(
    job: Job,
    candidateProfile: ExtractedProfile,
    options?: QuestionGenerationOptions
  ): Promise<QuestionGenerationResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };

    try {
      logger.info({
        event: 'interview_questions_generation_started',
        jobId: job._id,
        jobTitle: job.title,
        candidateSkills: candidateProfile.skills?.length || 0,
        targetDuration: opts.targetDuration,
      });

      const openai = await getOpenAI();

      const prompt = this.buildQuestionGenerationPrompt(
        job,
        candidateProfile,
        opts
      );

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4 for better question quality
        messages: [
          {
            role: 'system',
            content: `You are an expert technical recruiter and interviewer. Generate targeted, insightful interview questions that assess both technical capabilities and cultural fit. Return ONLY valid JSON without markdown formatting or code blocks.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7, // Balanced for creativity with consistency
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI for question generation');
      }

      const cleanedContent = this.stripMarkdownCodeBlocks(content);
      const parsed = JSON.parse(cleanedContent);

      // Validate and normalize the response
      const questions = this.validateAndNormalizeQuestions(
        parsed.questions || []
      );

      // Calculate total duration
      const totalEstimatedDuration = questions.reduce(
        (sum, q) => sum + q.expectedDuration,
        0
      );

      // Calculate cost
      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;
      const estimatedCostUSD = this.calculateCost(
        promptTokens,
        completionTokens
      );

      const duration = Date.now() - startTime;
      logger.info({
        event: 'interview_questions_generation_completed',
        jobId: job._id,
        questionCount: questions.length,
        totalDuration: totalEstimatedDuration,
        durationMs: duration,
        costUSD: estimatedCostUSD,
      });

      return {
        questions,
        totalEstimatedDuration,
        generationMetadata: {
          model: response.model,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUSD,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        event: 'interview_questions_generation_failed',
        jobId: job._id,
        durationMs: duration,
        error: (error as Error).message,
      });

      throw new Error(
        `Failed to generate interview questions: ${(error as Error).message}`
      );
    }
  }

  /**
   * Build the prompt for GPT-4 to generate interview questions
   */
  private buildQuestionGenerationPrompt(
    job: Job,
    candidateProfile: ExtractedProfile,
    options: Required<QuestionGenerationOptions>
  ): string {
    const categoryDistribution = this.calculateCategoryDistribution(options);

    return `Generate ${options.minQuestions} to ${options.maxQuestions} tailored interview questions for the following context:

**JOB DETAILS:**
- Title: ${job.title}
- Company: ${job.company}
- Experience Level: ${job.experienceLevel || 'Not specified'}
- Department: ${job.department || 'Not specified'}
- Description: ${job.description?.substring(0, 1000) || 'Not provided'}
${job.requirements ? `- Requirements: ${job.requirements.substring(0, 800)}` : ''}
- Key Skills: ${job.skills?.join(', ') || 'Not specified'}

**CANDIDATE PROFILE:**
- Professional Summary: ${candidateProfile.summary || 'Not available'}
- Years of Experience: ${this.estimateYearsOfExperience(candidateProfile)}
- Key Skills: ${candidateProfile.skills?.map(s => s.name).join(', ') || 'Not specified'}
- Recent Experience: ${this.getRecentExperienceSummary(candidateProfile)}
- Education: ${candidateProfile.education?.map(e => `${e.degree || ''} in ${e.fieldOfStudy || ''} from ${e.institution}`).join('; ') || 'Not specified'}

**QUESTION GENERATION REQUIREMENTS:**
- Total Duration Target: ${options.targetDuration} seconds (~${Math.round(options.targetDuration / 60)} minutes)
- Number of Questions: Between ${options.minQuestions} and ${options.maxQuestions}
- Category Distribution:
  * Technical: ~${categoryDistribution.technical} questions (test job-specific technical skills)
  * Behavioral: ~${categoryDistribution.behavioral} questions (assess soft skills and work style)
  * Experience: ~${categoryDistribution.experience} questions (explore past projects and achievements)
  * Situational: ~${categoryDistribution.situational} questions (problem-solving scenarios)

**GUIDELINES:**
1. Questions should be specific to the candidate's background and the job requirements
2. Mix difficulty levels appropriate for the experience level
3. Each question should naturally flow into a conversation (not just yes/no)
4. Technical questions should reference actual skills from both job and profile
5. Behavioral questions should relate to the company culture and role expectations
6. Include follow-up topics the AI interviewer can explore based on responses
7. Each question should have realistic time allocation (60-180 seconds per question)

Return ONLY a JSON object in this exact format:

{
  "questions": [
    {
      "id": "q1",
      "question": "The full question text here",
      "category": "technical",
      "difficulty": "medium",
      "expectedDuration": 120,
      "followUpTopics": ["topic1", "topic2", "topic3"],
      "scoringCriteria": ["criterion1", "criterion2", "criterion3"]
    }
  ]
}

Make questions conversational, insightful, and tailored to this specific candidate-job pairing.`;
  }

  /**
   * Calculate how many questions per category based on weights
   */
  private calculateCategoryDistribution(
    options: Required<QuestionGenerationOptions>
  ): Record<string, number> {
    const avgQuestions = (options.minQuestions + options.maxQuestions) / 2;
    return {
      technical: Math.round(avgQuestions * options.categoryWeights.technical),
      behavioral: Math.round(avgQuestions * options.categoryWeights.behavioral),
      experience: Math.round(avgQuestions * options.categoryWeights.experience),
      situational: Math.round(
        avgQuestions * options.categoryWeights.situational
      ),
    };
  }

  /**
   * Estimate years of experience from profile
   */
  private estimateYearsOfExperience(profile: ExtractedProfile): string {
    if (!profile.experience || profile.experience.length === 0) {
      return 'Not specified';
    }

    // Calculate from earliest start date to latest end date (or now)
    const experiences = profile.experience;
    let earliestStart: Date | null = null;
    let latestEnd: Date | null = null;

    experiences.forEach(exp => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        if (!earliestStart || start < earliestStart) {
          earliestStart = start;
        }
      }

      if (exp.isCurrent) {
        latestEnd = new Date();
      } else if (exp.endDate) {
        const end = new Date(exp.endDate);
        if (!latestEnd || end > latestEnd) {
          latestEnd = end;
        }
      }
    });

    if (earliestStart !== null && latestEnd !== null) {
      const years = Math.floor(
        ((latestEnd as Date).getTime() - (earliestStart as Date).getTime()) /
          (1000 * 60 * 60 * 24 * 365)
      );
      return `~${years} years`;
    }

    return 'Not specified';
  }

  /**
   * Get summary of most recent work experience
   */
  private getRecentExperienceSummary(profile: ExtractedProfile): string {
    if (!profile.experience || profile.experience.length === 0) {
      return 'No experience data available';
    }

    // Sort by start date descending
    const sorted = [...profile.experience].sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    const recent = sorted.slice(0, 2); // Get 2 most recent positions
    return recent
      .map(
        exp =>
          `${exp.position} at ${exp.company} (${exp.isCurrent ? 'Current' : exp.endDate?.substring(0, 7) || 'Unknown'})`
      )
      .join('; ');
  }

  /**
   * Validate and normalize question objects
   */
  private validateAndNormalizeQuestions(
    questions: unknown[]
  ): InterviewQuestion[] {
    const normalized = questions
      .map((q, index) => {
        try {
          const obj = q as Record<string, unknown>;
          const question: InterviewQuestion = {
            id: String(obj.id || `q${index + 1}`),
            question: String(obj.question || '').trim(),
            category: this.validateCategory(obj.category) || 'technical',
            difficulty: this.validateDifficulty(obj.difficulty) || 'medium',
            expectedDuration: this.normalizeExpectedDuration(
              obj.expectedDuration
            ),
          };

          // Add optional fields only if they exist
          if (Array.isArray(obj.followUpTopics)) {
            question.followUpTopics = obj.followUpTopics.filter(
              (t: unknown) => typeof t === 'string'
            ) as string[];
          }

          if (Array.isArray(obj.scoringCriteria)) {
            question.scoringCriteria = obj.scoringCriteria.filter(
              (c: unknown) => typeof c === 'string'
            ) as string[];
          }

          return question;
        } catch (error) {
          logger.warn({
            event: 'interview_question_validation_warning',
            index,
            error: (error as Error).message,
          });
          return null;
        }
      })
      .filter(
        (q): q is InterviewQuestion => q !== null && q.question.length > 0
      );

    return normalized;
  }

  private validateCategory(
    category: unknown
  ): 'technical' | 'behavioral' | 'experience' | 'situational' | null {
    const validCategories = [
      'technical',
      'behavioral',
      'experience',
      'situational',
    ];
    return validCategories.includes(category as string)
      ? (category as 'technical' | 'behavioral' | 'experience' | 'situational')
      : null;
  }

  private validateDifficulty(
    difficulty: unknown
  ): 'easy' | 'medium' | 'hard' | null {
    const validDifficulties = ['easy', 'medium', 'hard'];
    return validDifficulties.includes(difficulty as string)
      ? (difficulty as 'easy' | 'medium' | 'hard')
      : null;
  }

  private normalizeExpectedDuration(duration: unknown): number {
    const parsed = parseInt(String(duration), 10);
    if (isNaN(parsed) || parsed < 30 || parsed > 300) {
      return 120; // Default 2 minutes
    }
    return parsed;
  }

  /**
   * Strip markdown code block formatting from response
   */
  private stripMarkdownCodeBlocks(content: string): string {
    let cleaned = content.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    return cleaned.trim();
  }

  /**
   * Calculate estimated cost for GPT-4 question generation
   * GPT-4o pricing (as of 2024): $5.00 per 1M input tokens, $15.00 per 1M output tokens
   */
  private calculateCost(
    promptTokens: number,
    completionTokens: number
  ): number {
    const inputCost = (promptTokens / 1_000_000) * 5.0;
    const outputCost = (completionTokens / 1_000_000) * 15.0;
    return inputCost + outputCost;
  }
}

/**
 * Singleton instance for convenience
 */
export const interviewQuestionGenerator =
  new InterviewQuestionGeneratorService();

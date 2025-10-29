import { getOpenAI } from '../../ai/openai/client';
import type {
  ExtractedProfile,
  ExtractedSkill,
  ExperienceEntry,
  EducationEntry,
} from '../../shared/types/profile';
import { logger } from '../../monitoring/logger';
import { getResumeStorage } from '../storage/resumeStorage';

// Cost estimation constants (OpenAI GPT-4 pricing as of 2024)
const GPT4_INPUT_COST_PER_1K_TOKENS = 0.03; // $0.03 per 1K input tokens
const GPT4_OUTPUT_COST_PER_1K_TOKENS = 0.06; // $0.06 per 1K output tokens
const ESTIMATED_INPUT_TOKENS_PER_PAGE = 750; // Conservative estimate
const ESTIMATED_OUTPUT_TOKENS = 800; // For structured response

export class ResumeExtractionService {
  private readonly maxCostCents: number = 30; // $0.30 limit per resume

  async extractProfile(
    userId: string,
    resumeVersionId: string,
    storageKey: string
  ): Promise<ExtractedProfile> {
    const startTime = Date.now();

    try {
      logger.info({
        event: 'resume_extraction_started',
        userId: userId.slice(0, 8),
        resumeVersionId,
      });

      // Get the resume content
      const storage = getResumeStorage();
      const resumeBuffer = await storage.get(storageKey);
      const resumeText = await this.extractTextFromBuffer(resumeBuffer);

      // Estimate cost before processing
      const estimatedCostCents = this.estimateExtractionCost(resumeText);
      if (estimatedCostCents > this.maxCostCents) {
        throw new Error(
          `Estimated cost (${estimatedCostCents}¢) exceeds limit (${this.maxCostCents}¢)`
        );
      }

      // Extract structured data using OpenAI
      const extractedData = await this.performAIExtraction(resumeText);

      const profile: ExtractedProfile = {
        ...extractedData,
        extractedAt: new Date().toISOString(),
        extractionStatus: 'completed',
        costEstimate: estimatedCostCents,
      };

      const duration = Date.now() - startTime;
      logger.info({
        event: 'resume_extraction_completed',
        userId: userId.slice(0, 8),
        resumeVersionId,
        durationMs: duration,
        skillCount: profile.skills.length,
        experienceCount: profile.experience.length,
        costCents: estimatedCostCents,
      });

      return profile;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        event: 'resume_extraction_failed',
        userId: userId.slice(0, 8),
        resumeVersionId,
        durationMs: duration,
        error: (error as Error).message,
      });

      return {
        summary: undefined,
        skills: [],
        experience: [],
        education: [],
        extractedAt: new Date().toISOString(),
        extractionStatus: 'failed',
        extractionError: (error as Error).message,
      };
    }
  }

  private async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    // For now, we'll implement a simple text extraction
    // In a production system, you'd want to use libraries like:
    // - pdf-parse for PDFs
    // - mammoth for DOCX files
    // For this MVP, we'll assume the content is already text or use a placeholder

    // Simple heuristic: if it starts with PDF magic bytes, it's a PDF
    if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
      // TODO: Implement PDF text extraction
      throw new Error(
        'PDF text extraction not yet implemented. Please convert to text first.'
      );
    }

    // Assume it's a text-based format (DOCX, TXT, etc.)
    return buffer.toString('utf-8');
  }

  private estimateExtractionCost(text: string): number {
    const estimatedPages = Math.ceil(text.length / 3000); // ~3000 chars per page
    const inputTokens = estimatedPages * ESTIMATED_INPUT_TOKENS_PER_PAGE;
    const outputTokens = ESTIMATED_OUTPUT_TOKENS;

    const inputCost = (inputTokens / 1000) * GPT4_INPUT_COST_PER_1K_TOKENS;
    const outputCost = (outputTokens / 1000) * GPT4_OUTPUT_COST_PER_1K_TOKENS;

    return Math.ceil((inputCost + outputCost) * 100); // Convert to cents
  }

  private async performAIExtraction(
    resumeText: string
  ): Promise<
    Omit<
      ExtractedProfile,
      'extractedAt' | 'extractionStatus' | 'extractionError' | 'costEstimate'
    >
  > {
    const openai = await getOpenAI();

    const prompt = this.buildExtractionPrompt(resumeText);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // More cost-effective than GPT-4
      messages: [
        {
          role: 'system',
          content:
            'You are a professional resume parser. Extract structured information from resumes and return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = JSON.parse(content);
      return this.validateAndNormalizeExtraction(parsed);
    } catch (error) {
      logger.error({
        event: 'ai_extraction_parse_error',
        content: content.slice(0, 500),
        error: (error as Error).message,
      });
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  private buildExtractionPrompt(resumeText: string): string {
    return `Extract structured information from this resume and return valid JSON in exactly this format:

{
  "summary": "Brief professional summary (2-3 sentences)",
  "skills": [
    {
      "name": "JavaScript",
      "category": "programming_languages",
      "proficiency": "advanced",
      "yearsOfExperience": 3
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "startDate": "2020-01",
      "endDate": "2022-12",
      "isCurrent": false,
      "description": "Brief description",
      "skills": ["skill1", "skill2"],
      "location": "City, State"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "fieldOfStudy": "Computer Science",
      "startDate": "2016-09",
      "endDate": "2020-05"
    }
  ]
}

Categories for skills: programming_languages, frameworks_libraries, databases, cloud_platforms, tools_software, methodologies, soft_skills, domain_knowledge, other

Proficiency levels: beginner, intermediate, advanced, expert

Use ISO date format (YYYY-MM-DD) or YYYY-MM for dates. Set isCurrent=true for current positions.

Resume text:
${resumeText}

Return only the JSON, no additional text:`;
  }

  private validateAndNormalizeExtraction(
    data: unknown
  ): Omit<
    ExtractedProfile,
    'extractedAt' | 'extractionStatus' | 'extractionError' | 'costEstimate'
  > {
    // Basic validation and normalization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = data as any; // Safe cast since we validate each field
    const result = {
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.filter(this.isValidSkill)
        : [],
      experience: Array.isArray(parsed.experience)
        ? parsed.experience.filter(this.isValidExperience)
        : [],
      education: Array.isArray(parsed.education)
        ? parsed.education.filter(this.isValidEducation)
        : [],
    };

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isValidSkill = (skill: any): skill is ExtractedSkill => {
    return (
      skill &&
      typeof skill.name === 'string' &&
      skill.name.length > 0 &&
      typeof skill.category === 'string'
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isValidExperience = (exp: any): exp is ExperienceEntry => {
    return (
      exp &&
      typeof exp.company === 'string' &&
      exp.company.length > 0 &&
      typeof exp.position === 'string' &&
      exp.position.length > 0
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isValidEducation = (edu: any): edu is EducationEntry => {
    return (
      edu && typeof edu.institution === 'string' && edu.institution.length > 0
    );
  };
}

export const resumeExtractionService = new ResumeExtractionService();

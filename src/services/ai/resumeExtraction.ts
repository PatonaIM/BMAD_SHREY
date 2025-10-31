import { getOpenAI } from '../../ai/openai/client';
import type {
  ExtractedProfile,
  ExtractedSkill,
  ExperienceEntry,
  EducationEntry,
} from '../../shared/types/profile';
import { logger } from '../../monitoring/logger';
import { getResumeStorageAsync } from '../storage/resumeStorage';
import { skillNormalizationService } from './skillNormalization';

// pdf-parse-fork (v1) works better server-side without workers
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse-fork');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth');

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
      const storage = await getResumeStorageAsync();
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
      const { profile: extractedData, usage } =
        await this.performAIExtraction(resumeText);

      const profile: ExtractedProfile = {
        ...extractedData,
        extractedAt: new Date().toISOString(),
        extractionStatus: 'completed',
        costEstimate: {
          model: usage.model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUSD: estimatedCostCents / 100,
        },
      };

      const duration = Date.now() - startTime;
      logger.info({
        event: 'resume_extraction_completed',
        userId: userId.slice(0, 8),
        resumeVersionId,
        durationMs: duration,
        skillCount: profile.skills?.length || 0,
        experienceCount: profile.experience?.length || 0,
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
    // Check if it's a PDF file (starts with %PDF magic bytes)
    if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
      try {
        // pdf-parse-fork v1 API - simple and works well server-side
        const data = await pdfParse(buffer);
        return data.text;
      } catch (error) {
        logger.error({
          event: 'pdf_extraction_error',
          error: (error as Error).message,
        });
        throw new Error(
          `Failed to extract text from PDF: ${(error as Error).message}`
        );
      }
    }

    // Check if it's a DOCX file (ZIP signature: PK)
    if (buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (error) {
        logger.error({
          event: 'docx_extraction_error',
          error: (error as Error).message,
        });
        throw new Error(
          `Failed to extract text from DOCX: ${(error as Error).message}`
        );
      }
    }

    // For other files, assume it's plain text
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

  private async performAIExtraction(resumeText: string): Promise<{
    profile: Omit<
      ExtractedProfile,
      'extractedAt' | 'extractionStatus' | 'extractionError' | 'costEstimate'
    >;
    usage: {
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    const openai = await getOpenAI();

    const prompt = this.buildExtractionPrompt(resumeText);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // More cost-effective than GPT-4
      messages: [
        {
          role: 'system',
          content:
            'You are a professional resume parser. Extract structured information from resumes and return ONLY valid JSON without any markdown formatting, code blocks, or additional text.',
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
      // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
      const cleanedContent = this.stripMarkdownCodeBlocks(content);
      const parsed = JSON.parse(cleanedContent);
      const profile = this.validateAndNormalizeExtraction(parsed);

      return {
        profile,
        usage: {
          model: response.model,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      logger.error({
        event: 'ai_extraction_parse_error',
        content: content.slice(0, 500),
        error: (error as Error).message,
      });
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Strip markdown code block formatting from response
   * Handles: ```json ... ```, ``` ... ```, or plain JSON
   */
  private stripMarkdownCodeBlocks(content: string): string {
    let cleaned = content.trim();

    // Remove ```json\n ... \n``` blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    // Remove ``` ... ``` blocks
    else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    return cleaned.trim();
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

IMPORTANT: Return ONLY the JSON object. Do NOT wrap it in markdown code blocks or backticks. Do NOT include any text before or after the JSON.`;
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
    // Filter and normalize skills
    const rawSkills = Array.isArray(parsed.skills)
      ? parsed.skills.filter(this.isValidSkill)
      : [];
    const normalizedSkills = rawSkills.map((skill: ExtractedSkill) => {
      const normalized = skillNormalizationService.normalizeSkill(skill.name);
      return {
        ...skill,
        name: normalized.normalized, // Use normalized name
        category: (normalized.category ||
          'other') as ExtractedSkill['category'],
      };
    });

    const result = {
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      skills: normalizedSkills,
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

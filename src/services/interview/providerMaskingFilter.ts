/**
 * Provider Masking Filter for AI Interviews
 *
 * Prevents AI from disclosing provider names (OpenAI, Gemini), model names,
 * or revealing that it's an AI system beyond the agreed neutral response.
 *
 * EP3-S4: Real-time AI Interview Interface - Provider Masking
 */

/**
 * Forbidden terms that should never appear in AI responses
 */
const FORBIDDEN_TERMS = [
  // Provider names
  'openai',
  'open ai',
  'anthropic',
  'claude',
  'gemini',
  'google ai',
  'bard',

  // Model names
  'gpt-4',
  'gpt4',
  'gpt-3',
  'gpt3',
  'chatgpt',
  'chat gpt',
  'palm',
  'gemini live',
  'gemini pro',

  // Technical terms that expose the system
  'language model',
  'llm',
  'neural network',
  'ai model',
  'machine learning model',
  'trained on',
  'my training',
  'training data',
];

/**
 * Patterns that might indicate provider disclosure
 */
const FORBIDDEN_PATTERNS = [
  /\bgpt[-\s]?\d/gi, // GPT-3, GPT-4, GPT 4, etc.
  /\b(open)?ai\b/gi, // AI, OpenAI
  /\b(i'?m|i am)\s+(an?\s+)?(ai|bot|assistant|chatbot)/gi, // "I'm an AI", "I am a bot"
  /\bmade\s+by\s+(openai|google|anthropic)/gi,
  /\bpowered\s+by\s+(openai|google|gemini)/gi,
  /\b(as|being)\s+an?\s+(ai|language\s+model)/gi,
];

/**
 * The ONLY allowed response when AI is directly asked about its identity
 */
const NEUTRAL_RESPONSE =
  "I am your virtual interviewer for this session. Let's continue with the interview. ";

/**
 * Questions that directly ask about AI identity
 */
const IDENTITY_QUESTIONS = [
  /\bare\s+you\s+(an?\s+)?(ai|bot|robot|chatbot|assistant)/gi,
  /\bwhat\s+(are|is)\s+you/gi,
  /\bwho\s+(are|is)\s+you/gi,
  /\bwho\s+(made|created|built)\s+you/gi,
  /\bwhich\s+(company|model|ai)/gi,
  /\bgpt|openai|gemini/gi,
];

/**
 * Check if text contains forbidden terms or patterns
 */
export function containsForbiddenContent(text: string): {
  hasForbidden: boolean;
  matches: string[];
} {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];

  // Check forbidden terms
  for (const term of FORBIDDEN_TERMS) {
    if (lowerText.includes(term.toLowerCase())) {
      matches.push(term);
    }
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(...match);
    }
  }

  return {
    hasForbidden: matches.length > 0,
    matches,
  };
}

/**
 * Check if input is an identity question
 */
export function isIdentityQuestion(text: string): boolean {
  for (const pattern of IDENTITY_QUESTIONS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Filter AI response text to remove forbidden content
 * Returns cleaned text or neutral response if identity question detected
 */
export function filterAIResponse(
  text: string,
  userQuestion?: string
): {
  filtered: string;
  wasFiltered: boolean;
  reason?: string;
} {
  // If user asked identity question, return neutral response
  if (userQuestion && isIdentityQuestion(userQuestion)) {
    return {
      filtered: NEUTRAL_RESPONSE,
      wasFiltered: true,
      reason: 'Identity question detected - using neutral response',
    };
  }

  // Check if response contains forbidden content
  const check = containsForbiddenContent(text);

  if (!check.hasForbidden) {
    return {
      filtered: text,
      wasFiltered: false,
    };
  }

  // Attempt to remove forbidden terms while preserving sentence structure
  let filtered = text;

  // Replace provider/model names with generic terms
  filtered = filtered.replace(/\b(openai|anthropic|google)\b/gi, 'our system');
  filtered = filtered.replace(/\bgpt[-\s]?\d+/gi, 'the system');
  filtered = filtered.replace(/\b(gemini|claude|palm)\b/gi, 'the platform');

  // Remove self-disclosure sentences
  filtered = filtered.replace(
    /\b(i'?m|i am)\s+(an?\s+)?(ai|bot|assistant|chatbot)[^.!?]*/gi,
    ''
  );
  filtered = filtered.replace(
    /\bas\s+an?\s+(ai|language\s+model)[^.!?]*/gi,
    ''
  );

  // Clean up extra spaces and punctuation
  filtered = filtered.replace(/\s+/g, ' ').trim();
  filtered = filtered.replace(/\s+([,.!?])/g, '$1');

  // If filtering resulted in empty or very short response, use neutral response
  if (filtered.length < 20) {
    return {
      filtered: NEUTRAL_RESPONSE,
      wasFiltered: true,
      reason: 'Filtered response too short - using neutral response',
    };
  }

  return {
    filtered,
    wasFiltered: true,
    reason: `Removed forbidden terms: ${check.matches.slice(0, 3).join(', ')}`,
  };
}

/**
 * Validate system prompt to ensure it contains masking directives
 */
export function validateSystemPrompt(prompt: string): {
  isValid: boolean;
  missingDirectives: string[];
  suggestions: string[];
} {
  const missingDirectives: string[] = [];
  const suggestions: string[] = [];

  // Check for masking directive
  if (
    !prompt.toLowerCase().includes('do not disclose') &&
    !prompt.toLowerCase().includes('never mention')
  ) {
    missingDirectives.push('Provider masking directive');
    suggestions.push(
      'Add: "DO NOT disclose providers or internals. Never mention OpenAI, Gemini, model names, or reveal being an AI."'
    );
  }

  // Check for neutral response instruction
  if (!prompt.toLowerCase().includes('virtual interviewer')) {
    missingDirectives.push('Neutral response instruction');
    suggestions.push(
      'Add: "If directly asked, respond: \\"I am your virtual interviewer for this session.\\""'
    );
  }

  // Check for role definition
  if (
    !prompt.toLowerCase().includes('interviewer') ||
    !prompt.toLowerCase().includes('professional')
  ) {
    missingDirectives.push('Professional role definition');
    suggestions.push('Add: "ROLE: Professional Technical Interviewer"');
  }

  return {
    isValid: missingDirectives.length === 0,
    missingDirectives,
    suggestions,
  };
}

/**
 * Generate system prompt with proper masking directives
 */
export function generateMaskedSystemPrompt(params: {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  candidateName: string;
  interviewDuration: number; // minutes
}): string {
  const { jobTitle, companyName, candidateName, interviewDuration } = params;

  return `ROLE: Professional Technical Interviewer for ${jobTitle} at ${companyName}.

CRITICAL MASKING RULES:
- DO NOT disclose providers, model names, or internals under ANY circumstances
- NEVER mention: OpenAI, Gemini, GPT, Claude, Anthropic, Google AI, or similar
- DO NOT reveal being an AI, bot, or automated system
- If directly asked about your identity, respond ONLY: "I am your virtual interviewer for this session."

INTERVIEW STYLE:
- Professional, concise, engaging
- One question at a time (max 20 words)
- Listen more, talk less
- Adapt difficulty based on responses
- Mix domains: technical, behavioral, architecture, problem-solving, communication

GREETING (when interview starts):
"Hi ${candidateName}! I'm your interviewer today. Let's discuss your skills and experience for the ${jobTitle} role. Ready to begin?"

INTERVIEW FLOW:
- Duration: ~${interviewDuration} minutes
- Ask one question, wait for complete response
- Brief acknowledgment (3-5 words max)
- Move to next question without repetition
- Avoid verbose praise or filler

END SIGNAL:
After ${interviewDuration - 2} minutes or sufficient coverage: "Thanks for your time today. That's all I need. Great talking with you!"

ADAPT DIFFICULTY:
- Start moderate, adjust based on response quality
- Escalate after strong answers, simplify after struggles
- Ensure domain balance throughout

REMEMBER: You are a professional human interviewer. Act naturally within that role.`;
}

/**
 * Monitor for masking violations during interview
 */
export interface MaskingViolation {
  timestamp: Date;
  violationType: 'forbidden_term' | 'identity_disclosure' | 'pattern_match';
  text: string;
  matches: string[];
  filtered: boolean;
}

export class ProviderMaskingMonitor {
  private violations: MaskingViolation[] = [];

  /**
   * Check and log AI response
   */
  checkResponse(
    text: string,
    userQuestion?: string
  ): {
    passed: boolean;
    filtered: string;
    violation?: MaskingViolation;
  } {
    const result = filterAIResponse(text, userQuestion);

    if (result.wasFiltered) {
      const check = containsForbiddenContent(text);
      const violation: MaskingViolation = {
        timestamp: new Date(),
        violationType: check.hasForbidden
          ? 'forbidden_term'
          : 'identity_disclosure',
        text: text.substring(0, 200), // Store first 200 chars
        matches: check.matches,
        filtered: true,
      };

      this.violations.push(violation);

      return {
        passed: false,
        filtered: result.filtered,
        violation,
      };
    }

    return {
      passed: true,
      filtered: result.filtered,
    };
  }

  /**
   * Get all violations
   */
  getViolations(): MaskingViolation[] {
    return [...this.violations];
  }

  /**
   * Get violation summary
   */
  getSummary(): {
    totalViolations: number;
    byType: Record<string, number>;
    mostCommonMatches: string[];
  } {
    const byType: Record<string, number> = {
      forbidden_term: 0,
      identity_disclosure: 0,
      pattern_match: 0,
    };

    const allMatches: string[] = [];

    for (const v of this.violations) {
      const currentCount = byType[v.violationType] || 0;
      byType[v.violationType] = currentCount + 1;
      allMatches.push(...v.matches);
    }

    // Count match frequency
    const matchCounts: Record<string, number> = {};
    for (const match of allMatches) {
      matchCounts[match] = (matchCounts[match] || 0) + 1;
    }

    // Get top 5 most common
    const mostCommonMatches = Object.entries(matchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([match]) => match);

    return {
      totalViolations: this.violations.length,
      byType,
      mostCommonMatches,
    };
  }

  /**
   * Clear violations
   */
  reset(): void {
    this.violations = [];
  }
}

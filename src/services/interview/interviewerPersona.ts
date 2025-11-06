// EP5: Professional interviewer persona builder
// Generates initial instructions for realtime AI session.
// Accepts job description and candidate profile for personalized, relevant interviews.

export interface PersonaContext {
  applicationId: string;
  roleLabel?: string; // e.g., "Senior Backend Engineer", "Marketing Manager"
  jobDescription?: string; // Full job description with responsibilities and requirements
  candidateProfile?: {
    name?: string;
    experience?: string; // Years or summary
    background?: string; // Brief professional background
    skills?: string[]; // Candidate's listed skills
  };
  difficultyTier?: number; // 1..5 (optional) - adapts question complexity
}

export function buildInterviewerInstructions(ctx: PersonaContext): string {
  const role = ctx.roleLabel || 'the position';

  // Build job context
  let jobContext = '';
  if (ctx.jobDescription) {
    // Truncate if too long to fit in prompt
    const maxLength = 1200;
    const description =
      ctx.jobDescription.length > maxLength
        ? ctx.jobDescription.slice(0, maxLength) + '...'
        : ctx.jobDescription;
    jobContext = `\n\nJOB DESCRIPTION:\n${description}`;
  }

  // Build candidate context
  let candidateContext = '';
  if (ctx.candidateProfile) {
    const parts: string[] = [];
    if (ctx.candidateProfile.name) {
      parts.push(`Name: ${ctx.candidateProfile.name}`);
    }
    if (ctx.candidateProfile.experience) {
      parts.push(`Experience: ${ctx.candidateProfile.experience}`);
    }
    if (ctx.candidateProfile.background) {
      parts.push(`Background: ${ctx.candidateProfile.background}`);
    }
    if (ctx.candidateProfile.skills && ctx.candidateProfile.skills.length > 0) {
      parts.push(
        `Skills: ${ctx.candidateProfile.skills.slice(0, 15).join(', ')}`
      );
    }
    if (parts.length > 0) {
      candidateContext = `\n\nCANDIDATE PROFILE:\n${parts.join('\n')}`;
    }
  }

  const tierHint = ctx.difficultyTier
    ? ` Adapt question complexity to tier ${ctx.difficultyTier}/5.`
    : '';

  return [
    'SYSTEM ROLE: You are a professional interviewer conducting a structured live interview.',
    `APPLICATION ID: ${ctx.applicationId}.`,
    `ROLE BEING INTERVIEWED FOR: ${role}.`,
    jobContext,
    candidateContext,
    '\n\nINTERVIEW APPROACH:',
    '- STYLE: Professional, conversational, and attentive. Ask one question at a time and listen actively.',
    '- PHASES: (1) Warm greeting and candidate introduction; (2) Role-relevant questions based on job requirements and candidate background; (3) Final scoring when requested.',
    '- GREETING: Welcome the candidate and invite them to briefly introduce themselves (30-45 seconds). Listen to their full introduction before proceeding.',
    "- QUESTION STRATEGY: Tailor questions to both the job requirements AND the candidate's background. Ask about their relevant experience, skills they've listed, and how they would handle responsibilities mentioned in the job description.",
    '- QUESTION TYPES: Mix of behavioral (past experiences), situational (hypothetical scenarios), and role-specific technical/functional questions as appropriate for the position.',
    '- DEPTH: Start with open-ended questions, ask thoughtful follow-ups to understand their thinking process and real-world application of skills.',
    '- FAIRNESS: Avoid bias, stay objective, and give candidates opportunities to showcase their strengths.',
    '- SCORING: Evaluate across multiple dimensions: relevance of experience, clarity of communication, depth of knowledge, problem-solving approach, and cultural fit indicators.',
    '- AUDIO: Keep responses concise (10-15 seconds) for acknowledgments, longer for follow-up questions or feedback.',
    '- DO NOT: Lead candidates to answers, make assumptions based on limited information, or discuss internal scoring mechanisms during the interview.',
    tierHint,
  ].join(' ');
}

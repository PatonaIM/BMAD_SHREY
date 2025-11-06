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
  const role = ctx.roleLabel || 'this position';

  // Build job context (truncate if too long)
  let jobContext = '';
  if (ctx.jobDescription) {
    const maxLength = 1000;
    const description =
      ctx.jobDescription.length > maxLength
        ? ctx.jobDescription.slice(0, maxLength) + '...'
        : ctx.jobDescription;
    jobContext = `\n\nRole: ${description}`;
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
      candidateContext = `\n\nCandidate: ${parts.join(', ')}`;
    }
  }

  return [
    'You are a professional interviewer conducting a natural conversation.',
    `Position: ${role}.`,
    jobContext,
    candidateContext,
    '\n\nConversation Flow:',
    '- Start with a warm greeting and ask the candidate to introduce themselves',
    '- Listen to their full introduction before proceeding',
    '- Based on their background and the role requirements, ask relevant questions naturally',
    '- After meaningful answers, use submit_answer_score tool to provide real-time evaluation',
    '- Keep the conversation flowing naturally - no need for rigid structure or artificial pauses',
    '- Be professional but conversational and engaging',
    '- When satisfied with your assessment (typically 5-8 questions), use generate_final_feedback tool to complete the interview',
  ].join(' ');
}

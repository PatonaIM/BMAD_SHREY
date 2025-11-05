// EP5-S3: Context Assembler & Difficulty / Gap primitives (initial design)
// Sequential implementation step 1: data shapes + core assembly logic (no domain quota yet).

export interface AnswerEvaluation {
  clarity: number; // 0..1
  correctness: number; // 0..1
  depth: number; // 0..1
  tokens: string[]; // extracted salient skill tokens from the answer
  createdAt: number; // epoch ms
}

export interface JobProfile {
  requiredSkills: string[]; // canonical skill tokens for role
  roleType: 'technical' | 'mixed' | 'nontechnical';
}

export interface SkillGapFragment {
  id: string; // fragment identifier
  missingSkills: string[]; // tokens currently missing
  kind: 'gap';
}

export interface AnswerSummaryFragment {
  id: string;
  summary: string; // concise natural language summary of recent answers
  coveredSkills: string[]; // deduplicated high-quality skill tokens
  kind: 'answer-summary';
}

export interface DifficultyFragment {
  id: string;
  tier: number; // 1..5
  rationale: string; // text explanation of tier change or retention
  kind: 'difficulty';
}

export interface SystemFragment {
  id: string;
  text: string;
  kind: 'system';
}

export type QuestionContextFragment =
  | SkillGapFragment
  | AnswerSummaryFragment
  | DifficultyFragment
  | SystemFragment;

export interface ContextAssemblerInput {
  answers: AnswerEvaluation[]; // ordered oldest -> newest
  job: JobProfile;
  currentDifficultyTier: number; // previous tier before recalculation
  maxTokens: number; // hard cap (e.g. 4000)
}

export interface ContextAssemblerOutput {
  fragments: QuestionContextFragment[];
  estimatedTokens: number; // total estimated tokens after trimming
  newDifficultyTier: number;
  missingSkills: string[]; // final gap list after trimming
}

// Heuristic score function from story spec
export function scoreAnswer(a: AnswerEvaluation): number {
  return 0.4 * a.clarity + 0.4 * a.correctness + 0.2 * a.depth;
}

// Difficulty progression: escalate if last two scores >= 0.7, demote if last two <= 0.4, clamp 1..5.
export function computeDifficultyTier(
  answers: AnswerEvaluation[],
  previousTier: number
): { tier: number; rationale: string } {
  const recent = answers.slice(-2);
  if (recent.length < 2) {
    return { tier: previousTier, rationale: 'Insufficient history for change' };
  }
  const scores = recent.map(scoreAnswer);
  const allStrong = scores.every(s => s >= 0.7);
  const allWeak = scores.every(s => s <= 0.4);
  let tier = previousTier;
  let rationale = 'Retain tier';
  if (allStrong) {
    tier = Math.min(5, previousTier + 1);
    rationale = 'Escalate: two consecutive strong answers';
  } else if (allWeak) {
    tier = Math.max(1, previousTier - 1);
    rationale = 'Downgrade: two consecutive weak answers';
  }
  return { tier, rationale };
}

// Semantic gap detection: requiredSkills minus high-quality covered tokens (defined as tokens from answers with correctness >=0.6).
export function detectSkillGaps(
  answers: AnswerEvaluation[],
  requiredSkills: string[]
): string[] {
  const covered = new Set<string>();
  for (const a of answers) {
    if (a.correctness >= 0.6) {
      a.tokens.forEach(t => covered.add(normalizeToken(t)));
    }
  }
  return requiredSkills
    .map(normalizeToken)
    .filter(token => !covered.has(token));
}

function normalizeToken(t: string): string {
  return t.trim().toLowerCase();
}

// Build an answer summary (simple heuristic: last 3 answers tokens + average scores)
export function buildAnswerSummary(
  answers: AnswerEvaluation[]
): AnswerSummaryFragment {
  const recent = answers.slice(-3);
  const coveredSkills = Array.from(
    new Set(recent.flatMap(a => a.tokens.map(normalizeToken)))
  );
  const avgClarity = average(recent.map(a => a.clarity));
  const avgCorrectness = average(recent.map(a => a.correctness));
  const avgDepth = average(recent.map(a => a.depth));
  const summary = `Recent answers show clarity ${avgClarity.toFixed(2)}, correctness ${avgCorrectness.toFixed(2)}, depth ${avgDepth.toFixed(2)}. Covered skills: ${coveredSkills.join(', ') || 'none'}.`;
  return {
    id: fragmentId('answer'),
    summary,
    coveredSkills,
    kind: 'answer-summary',
  };
}

function average(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

// Approximate token count (chars / 4) — coarse heuristic
function estimateTokens(fragments: QuestionContextFragment[]): number {
  const chars = fragments.map(f => JSON.stringify(f)).join('').length;
  return Math.ceil(chars / 4);
}

function fragmentId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function assembleContext(
  input: ContextAssemblerInput
): ContextAssemblerOutput {
  const { answers, job, currentDifficultyTier, maxTokens } = input;

  // Difficulty tier
  const diff = computeDifficultyTier(answers, currentDifficultyTier);

  // Summary fragment
  const summaryFrag = buildAnswerSummary(answers);

  // Gap fragment
  const missingSkills = detectSkillGaps(answers, job.requiredSkills);
  const gapFrag: SkillGapFragment = {
    id: fragmentId('gap'),
    missingSkills,
    kind: 'gap',
  };

  // Difficulty fragment
  const difficultyFrag: DifficultyFragment = {
    id: fragmentId('difficulty'),
    tier: diff.tier,
    rationale: diff.rationale,
    kind: 'difficulty',
  };

  // System fragment (policy / guidance for prompt) — minimal placeholder
  const systemFrag: SystemFragment = {
    id: fragmentId('system'),
    text: 'Generate an adaptive next interview question. Focus on unresolved skill gaps and maintain conversational coherence.',
    kind: 'system',
  };

  let fragments: QuestionContextFragment[] = [
    systemFrag,
    summaryFrag,
    gapFrag,
    difficultyFrag,
  ];

  let estimatedTokens = estimateTokens(fragments);
  if (estimatedTokens > maxTokens) {
    // Trim strategy: drop oldest informational fragments first (summary -> gap) while preserving system + difficulty.
    fragments = [systemFrag, difficultyFrag];
    estimatedTokens = estimateTokens(fragments);
  }

  return {
    fragments,
    estimatedTokens,
    newDifficultyTier: diff.tier,
    missingSkills,
  };
}

// Placeholder export for next sequential step (domain quota) — will be implemented later.
export interface DomainQuotaState {
  technicalCount: number;
  behavioralCount: number;
  architectureCount: number;
}

export type QuestionDomain = 'technical' | 'behavioral' | 'architecture';

export function selectNextDomain(
  _state: DomainQuotaState,
  _role: JobProfile
): QuestionDomain {
  // Stub; real implementation will enforce quotas and weighting.
  return 'technical';
}

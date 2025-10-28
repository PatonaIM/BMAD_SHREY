import { ok, err, type Result } from '../../shared/result';
import { ErrorCodes } from '../../shared/errors';

// Simple skill overlap scoring placeholder. Later will integrate embeddings & weighting.
export function computeMatchScore(
  candidateSkills: string[],
  jobSkills: string[]
): Result<
  { score: number; overlap: string[] },
  typeof ErrorCodes.MATCH_EMPTY_INPUT | typeof ErrorCodes.MATCH_VECTOR_FAIL
> {
  if (!candidateSkills.length || !jobSkills.length) {
    return err(ErrorCodes.MATCH_EMPTY_INPUT, 'Candidate or job skills empty');
  }
  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()));
  const overlap: string[] = [];
  for (const js of jobSkills) {
    const lower = js.toLowerCase();
    if (candidateSet.has(lower)) overlap.push(lower);
  }
  const score = overlap.length / jobSkills.length;
  return ok({ score, overlap });
}

import { describe, it, expect } from 'vitest';
import { computeMatchScore } from './matchScorer';

describe('computeMatchScore', () => {
  it('returns error on empty inputs', () => {
    const res = computeMatchScore([], ['ts']);
    expect(res.ok).toBe(false);
  });

  it('computes overlap score', () => {
    const res = computeMatchScore(
      ['TypeScript', 'React'],
      ['TypeScript', 'Node']
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.score).toBeCloseTo(0.5);
      expect(res.value.overlap).toContain('typescript');
    }
  });
});

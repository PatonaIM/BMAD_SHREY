import { describe, it, expect } from 'vitest';
import { cosineSimilarity, normalize } from './vector';

describe('vector utils', () => {
  it('cosineSimilarity of identical vectors is 1', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });
  it('normalize returns unit length vector', () => {
    const v = [3, 4];
    const n = normalize(v);
    const len = Math.sqrt(n.reduce((acc, x) => acc + x * x, 0));
    expect(len).toBeCloseTo(1);
  });
});

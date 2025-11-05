import { describe, it, expect } from 'vitest';
import {
  shouldDowngrade,
  shouldUseFallback,
} from '../services/interview/compositeRecorder';

describe('CompositeRecorder helpers', () => {
  it('shouldDowngrade returns true when avg cost exceeds threshold', () => {
    expect(shouldDowngrade(30, 25)).toBe(true);
  });
  it('shouldDowngrade returns false when avg cost below threshold', () => {
    expect(shouldDowngrade(10, 25)).toBe(false);
  });
  it('shouldUseFallback matches environment support', () => {
    // In jsdom environment captureStream is typically undefined, so expect true
    const expected = !('captureStream' in HTMLCanvasElement.prototype);
    expect(shouldUseFallback()).toBe(expected);
  });
});

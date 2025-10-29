import { describe, it, expect } from 'vitest';
import { validateResume, MAX_RESUME_BYTES } from './resumeValidation';

describe('validateResume', () => {
  it('accepts valid PDF', () => {
    const res = validateResume('cv.pdf', 'application/pdf', 1024);
    expect(res.ok).toBe(true);
  });
  it('rejects invalid type', () => {
    const res = validateResume('image.png', 'image/png', 500);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('RESUME_INVALID_TYPE');
  });
  it('rejects too large', () => {
    const res = validateResume(
      'big.pdf',
      'application/pdf',
      MAX_RESUME_BYTES + 1
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('RESUME_TOO_LARGE');
  });
});

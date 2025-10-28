import { describe, it, expect } from 'vitest';
import { appRouter } from './appRouter';

describe('healthRouter', () => {
  it('ping returns ok true and timestamp', async () => {
    const caller = appRouter.createCaller({});
    const res = await caller.health.ping();
    expect(res.ok).toBe(true);
    expect(typeof res.ts).toBe('number');
  });
});

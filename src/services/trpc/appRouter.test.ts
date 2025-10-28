import { describe, it, expect, vi } from 'vitest';

vi.mock('@bmad/config/env', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test-db',
    OPENAI_API_KEY: 'sk-test',
  }),
}));

vi.mock('../../data-access/mongoClient', () => ({
  getMongoClient: async () => ({
    db: () => ({
      collection: () => ({
        findOne: async () => null,
        insertOne: async () => {},
      }),
    }),
  }),
}));

import { appRouter } from './appRouter';

describe('healthRouter', () => {
  it('ping returns ok true and timestamp', async () => {
    const caller = appRouter.createCaller({
      session: { user: { email: 'test@example.com' } },
      ip: undefined,
    });
    const res = await caller.health.ping();
    expect(res.ok).toBe(true);
    expect(typeof res.ts).toBe('number');
  });
});

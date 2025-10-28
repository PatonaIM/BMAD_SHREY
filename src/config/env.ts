import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  MONGODB_URI: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

let cached: ReturnType<typeof EnvSchema.parse> | null = null;
export function getEnv(): ReturnType<typeof EnvSchema.parse> {
  if (cached) return cached;
  const parsed = EnvSchema.parse(process.env);
  cached = parsed;
  return parsed;
}

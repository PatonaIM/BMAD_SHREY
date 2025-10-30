import { z } from 'zod';

function sanitizeSubdomain(raw?: string) {
  if (!raw) return undefined;
  let v = raw.trim().toLowerCase();
  // Strip protocol and workable domain if mistakenly included
  v = v.replace(/^https?:\/\//, '');
  v = v.replace(/\.workable\.com.*$/, '');
  // Allow alphanumeric and hyphen only
  if (!/^[a-z0-9-]+$/.test(v)) return undefined;
  return v;
}

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    MONGODB_URI: z.string().url(),
    NEXTAUTH_SECRET: z
      .string()
      .min(
        1,
        'NEXTAUTH_SECRET is required (generate via: openssl rand -base64 32)'
      )
      .optional()
      .transform(v => (v && v.length > 0 ? v : undefined)),
    OPENAI_API_KEY: z
      .string()
      .optional()
      .transform(v => (v && v.length > 0 ? v : undefined)),
    ENABLE_AI_INTERVIEW: z
      .string()
      .optional()
      .transform(v => v === 'true')
      .pipe(z.boolean().default(false)),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM: z
      .string()
      .optional()
      .transform(v => (v && v.length > 0 ? v : undefined)),
    SENTRY_DSN: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    PASSWORD_RESET_TOKEN_TTL_MINUTES: z
      .string()
      .optional()
      .transform(v => (v && v.length > 0 ? parseInt(v, 10) : 30))
      .pipe(z.number().int().min(5).max(1440)),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    AUTO_ELEVATE_FIRST_OAUTH_ADMIN: z
      .string()
      .optional()
      .transform(v => v === 'true')
      .pipe(z.boolean().default(false)),
    WORKABLE_API_KEY: z
      .string()
      .optional()
      .transform(v => (v && v.length > 0 ? v : undefined)),
    WORKABLE_SUBDOMAIN: z
      .string()
      .optional()
      .transform(v => sanitizeSubdomain(v)),
    CRON_SECRET: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    VECTOR_DIMENSIONS: z
      .string()
      .optional()
      .transform(v => (v && v.length > 0 ? parseInt(v, 10) : 1536))
      .pipe(z.number().int().min(384).max(3072)),
  })
  .superRefine((data, ctx) => {
    // Require NEXTAUTH_SECRET strictly in production
    if (data.NODE_ENV === 'production' && !data.NEXTAUTH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXTAUTH_SECRET'],
        message: 'NEXTAUTH_SECRET must be set in production',
      });
    }
    if (data.ENABLE_AI_INTERVIEW && !data.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OPENAI_API_KEY'],
        message: 'OPENAI_API_KEY is required when ENABLE_AI_INTERVIEW=true',
      });
    }
    if (data.WORKABLE_SUBDOMAIN && !data.WORKABLE_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WORKABLE_API_KEY'],
        message: 'WORKABLE_API_KEY required when WORKABLE_SUBDOMAIN is set',
      });
    }
  });

let cached: ReturnType<typeof EnvSchema.parse> | null = null;
export function getEnv(): ReturnType<typeof EnvSchema.parse> {
  if (cached) return cached;
  const raw = { ...process.env } as Record<string, string | undefined>;
  // Provide a safe fallback for tests to avoid mandatory real URI
  if (
    (!raw.MONGODB_URI || raw.MONGODB_URI.length === 0) &&
    raw.NODE_ENV === 'test'
  ) {
    raw.MONGODB_URI = 'mongodb://localhost:27017/bmad-test';
  }
  const parsed = EnvSchema.parse(raw);
  cached = parsed;
  return parsed;
}

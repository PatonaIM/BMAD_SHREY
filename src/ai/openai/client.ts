import { getEnv } from '../../config/env';
// Defer importing openai to avoid bundling worker dependencies in environments where it's unused.
// Some Next.js build paths (especially edge or vendor chunk optimization) can error resolving worker.js.
let openai: any | null = null;
export async function getOpenAI() {
  if (openai) return openai;
  const { OPENAI_API_KEY, ENABLE_AI_INTERVIEW } = getEnv();
  if (!ENABLE_AI_INTERVIEW || !OPENAI_API_KEY) {
    // Provide a minimal stub so callers can still be invoked safely.
    openai = {
      chat: {
        completions: async () => {
          throw new Error(
            'OpenAI disabled (ENABLE_AI_INTERVIEW=false or missing API key)'
          );
        },
      },
    };
    return openai;
  }
  // Dynamic import only when needed and on server
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client should not be used in the browser');
  }
  const mod = await import('openai');
  openai = new mod.default({ apiKey: OPENAI_API_KEY });
  return openai;
}

import OpenAI from 'openai';
import { getEnv } from '@bmad/config';

let openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (openai) return openai;
  const { OPENAI_API_KEY } = getEnv();
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  return openai;
}

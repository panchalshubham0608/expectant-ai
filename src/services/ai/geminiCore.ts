import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';

const getRuntimeEnv = (): Record<string, string | undefined> | undefined =>
  typeof process !== 'undefined' && process.env
    ? process.env
    : (import.meta.env as Record<string, string | undefined> | undefined);

export const getGeminiModel = (): string =>
  getRuntimeEnv()?.VITE_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

export const getGeminiImageModel = (): string =>
  getRuntimeEnv()?.VITE_GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL;

export const getGeminiClient = (userApiKey?: string) => {
  const apiKey = userApiKey || getRuntimeEnv()?.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add it from the "More" menu in your profile.');
  }

  // Initialize and return the official SDK client
  return new GoogleGenAI({ apiKey });
};
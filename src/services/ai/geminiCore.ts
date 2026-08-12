import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-1.5-flash';

export const getGeminiClient = (userApiKey?: string) => {
  const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env;
  const apiKey = userApiKey || env?.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add it from the "More" menu in your profile.');
  }

  // Initialize and return the official SDK client
  return new GoogleGenAI({ apiKey });
};
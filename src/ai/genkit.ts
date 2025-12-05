import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY || "AIzaSyBo028lDGC2e6p7tqrBr8CWYXu66qDAujI" })
  ],
  model: 'googleai/gemini-1.5-pro',
});

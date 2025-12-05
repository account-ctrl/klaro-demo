import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const GEMINI_KEY = "AIzaSyBo028lDGC2e6p7tqrBr8CWYXu66qDAujI";

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: GEMINI_KEY })
  ],
  model: 'googleai/gemini-1.5-flash',
});

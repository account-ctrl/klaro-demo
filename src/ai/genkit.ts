import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const GEMINI_API_KEY = "AIzaSyCfFTHZyeJQr2jd95N0xLX68nTG44DfW2Q";

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: GEMINI_API_KEY })
  ],
  model: 'googleai/gemini-2.0-flash',
});

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { firebaseConfig } from '@/firebase/config';

// NOTE: The Google AI plugin is temporarily disabled to prevent build crashes due to 
// missing Cloud API permissions (Generative Language API not enabled).
// To re-enable, add `googleAI({ apiKey: firebaseConfig.apiKey })` to the plugins array.

export const ai = genkit({
  plugins: [
    // googleAI({ apiKey: firebaseConfig.apiKey }) 
  ],
  // model: 'googleai/gemini-1.5-flash', 
});

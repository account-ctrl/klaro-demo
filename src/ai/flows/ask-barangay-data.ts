'use server';
/**
 * @fileOverview An AI tool that answers questions about Barangay data from Firestore.
 *
 * - askBarangayData - A function that handles answering questions about Barangay data.
 * - AskBarangayDataInput - The input type for the askBarangayData function.
 * - AskBarangayDataOutput - The return type for the askBarangayData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AskBarangayDataInputSchema = z.object({
  query: z.string().describe('The user\'s question about the barangay data.'),
  residentDemographics: z
    .string()
    .describe('Resident demographics data in JSON format.'),
  projectStatus: z.string().describe('Project status data in JSON format.'),
  blotterResolutions: z
    .string()
    .describe('Blotter resolutions data in JSON format.'),
});
export type AskBarangayDataInput = z.infer<typeof AskBarangayDataInputSchema>;

const AskBarangayDataOutputSchema = z.object({
  answer: z
    .string()
    .describe('The answer to the user\'s question based on the provided data.'),
});
export type AskBarangayDataOutput = z.infer<typeof AskBarangayDataOutputSchema>;

export async function askBarangayData(
  input: AskBarangayDataInput
): Promise<AskBarangayDataOutput> {
  return askBarangayDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askBarangayDataPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: AskBarangayDataInputSchema },
  output: { schema: AskBarangayDataOutputSchema },
  prompt: `You are an expert data analyst for a local government unit in the Philippines. Your task is to answer questions based on the provided JSON data about the barangay.

  CONTEXT:
  - Resident Demographics: {{{residentDemographics}}}
  - Project Status: {{{projectStatus}}}
  - Blotter Resolutions: {{{blotterResolutions}}}

  Based on the data above, answer the following question. Be concise and helpful.

  Question: {{{query}}}
  `,
});

const askBarangayDataFlow = ai.defineFlow(
  {
    name: 'askBarangayDataFlow',
    inputSchema: AskBarangayDataInputSchema,
    outputSchema: AskBarangayDataOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

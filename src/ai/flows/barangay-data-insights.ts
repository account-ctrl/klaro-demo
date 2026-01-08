'use server';
/**
 * @fileOverview An AI tool that analyzes Barangay data from Firestore to generate insights.
 *
 * - getBarangayInsights - A function that handles the generation of insights from Barangay data.
 * - BarangayDataInsightsInput - The input type for the getBarangayInsights function.
 * - BarangayDataInsightsOutput - The return type for the getBarangayInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BarangayDataInsightsInputSchema = z.object({
  residentDemographics: z.string().describe('Resident demographics data in JSON format.'),
  projectStatus: z.string().describe('Project status data in JSON format.'),
  blotterResolutions: z.string().describe('Blotter resolutions data in JSON format.'),
});
export type BarangayDataInsightsInput = z.infer<typeof BarangayDataInsightsInputSchema>;

const BarangayDataInsightsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of overall insights.'),
  demographicInsights: z.array(z.string()).describe('Specific insights related to resident demographics.'),
  projectInsights: z.array(z.string()).describe('Specific insights related to project status.'),
  blotterInsights: z.array(z.string()).describe('Specific insights related to blotter resolutions.'),
  recommendations: z.array(z.string()).describe('Actionable recommendations for Barangay officials.')
});
export type BarangayDataInsightsOutput = z.infer<typeof BarangayDataInsightsOutputSchema>;

export async function getBarangayInsights(input: BarangayDataInsightsInput): Promise<BarangayDataInsightsOutput> {
  try {
    return await barangayDataInsightsFlow(input);
  } catch (error: any) {
    console.error("Genkit Flow Error:", error);
    // Return a structured fallback with the error message
    return {
      summary: `AI Service Error: ${error.message || 'Unknown error'}. Please check API key quotas.`,
      demographicInsights: [],
      projectInsights: [],
      blotterInsights: [],
      recommendations: []
    };
  }
}

const prompt = ai.definePrompt({
  name: 'barangayDataInsightsPrompt',
  input: {schema: BarangayDataInsightsInputSchema},
  output: {schema: BarangayDataInsightsOutputSchema},
  prompt: `You are an AI assistant that analyzes Barangay data to generate insights.

  Analyze the following data and provide insights that can help Barangay officials make data-informed decisions.

  Resident Demographics: {{{residentDemographics}}}
  Project Status: {{{projectStatus}}}
  Blotter Resolutions: {{{blotterResolutions}}}

  Generate a structured analysis containing:
  1. A concise summary of the overall situation.
  2. Specific insights derived from the resident demographics (e.g., age distribution shifts, vulnerable groups).
  3. Insights related to project statuses (e.g., delays, successes, resource allocation).
  4. Observations from blotter resolutions (e.g., crime trends, resolution efficiency).
  5. Actionable recommendations for the Barangay officials based on the analysis.
  `,
});

const barangayDataInsightsFlow = ai.defineFlow(
  {
    name: 'barangayDataInsightsFlow',
    inputSchema: BarangayDataInsightsInputSchema,
    outputSchema: BarangayDataInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

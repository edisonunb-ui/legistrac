'use server';
/**
 * @fileOverview A Genkit flow for generating concise summaries of demand descriptions.
 *
 * - generateDemandSummary - A function that generates a summary of a demand description.
 * - DemandSummaryInput - The input type for the generateDemandSummary function.
 * - DemandSummaryOutput - The return type for the generateDemandSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DemandSummaryInputSchema = z.object({
  description: z.string().describe('The demand description to summarize.'),
});
export type DemandSummaryInput = z.infer<typeof DemandSummaryInputSchema>;

const DemandSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the demand description.'),
});
export type DemandSummaryOutput = z.infer<typeof DemandSummaryOutputSchema>;

export async function generateDemandSummary(
  input: DemandSummaryInput
): Promise<DemandSummaryOutput> {
  return demandSummaryFlow(input);
}

const demandSummaryPrompt = ai.definePrompt({
  name: 'demandSummaryPrompt',
  input: {schema: DemandSummaryInputSchema},
  output: {schema: DemandSummaryOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing demand descriptions.

Read the following demand description carefully and provide a concise summary that captures its core content. The summary should be brief, to the point, and easy to understand at a glance.

Demand Description: {{{description}}}`,
});

const demandSummaryFlow = ai.defineFlow(
  {
    name: 'demandSummaryFlow',
    inputSchema: DemandSummaryInputSchema,
    outputSchema: DemandSummaryOutputSchema,
  },
  async input => {
    const {output} = await demandSummaryPrompt(input);
    if (!output) {
      throw new Error('Failed to generate demand summary.');
    }
    return output;
  }
);

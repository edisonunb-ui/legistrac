'use server';
/**
 * @fileOverview A Genkit flow for generating concise summaries of demand descriptions.
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
  prompt: `You are an AI assistant tasked with summarizing political cabinet demands.
Read the following demand description and provide a one-sentence summary that captures the essence of the request.
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

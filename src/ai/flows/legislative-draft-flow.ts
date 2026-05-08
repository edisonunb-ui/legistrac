
'use server';
/**
 * @fileOverview A Genkit flow for drafting formal legislative documents from citizen demands.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LegislativeDraftInputSchema = z.object({
  demandTitle: z.string().describe('The title of the demand.'),
  demandDescription: z.string().describe('The description of the citizen request.'),
  type: z.enum(['INDICACAO', 'PROJETO_LEI', 'REQUERIMENTO']).describe('The type of legislative document to draft.'),
  vereadorName: z.string().describe('The name of the councillor.'),
});
export type LegislativeDraftInput = z.infer<typeof LegislativeDraftInputSchema>;

const LegislativeDraftOutputSchema = z.object({
  title: z.string().describe('A formal title for the legislative action.'),
  content: z.string().describe('The full formal text of the document in Markdown.'),
  justification: z.string().describe('A logical and political justification for the action.'),
});
export type LegislativeDraftOutput = z.infer<typeof LegislativeDraftOutputSchema>;

export async function draftLegislativeAction(
  input: LegislativeDraftInput
): Promise<LegislativeDraftOutput> {
  return legislativeDraftFlow(input);
}

const legislativeDraftPrompt = ai.definePrompt({
  name: 'legislativeDraftPrompt',
  input: {schema: LegislativeDraftInputSchema},
  output: {schema: LegislativeDraftOutputSchema},
  prompt: `You are an expert legislative consultant for a Brazilian City Council (Câmara Municipal).
Your task is to transform a citizen demand into a formal legislative document.

Type of document: {{{type}}}
Councillor: {{{vereadorName}}}
Demand Title: {{{demandTitle}}}
Original Description: {{{demandDescription}}}

Instructions:
1. Use formal Portuguese (Linguagem Jurídica e Administrativa).
2. For "INDICACAO", suggest improvements to the Executive branch (Mayor).
3. For "PROJETO_LEI", create a basic legal structure (Articles).
4. For "REQUERIMENTO", ask for official information from the city departments.
5. Ensure the tone is professional, respectful, and politically strategic.
6. The content should be ready to be printed on official letterhead.`,
});

const legislativeDraftFlow = ai.defineFlow(
  {
    name: 'legislativeDraftFlow',
    inputSchema: LegislativeDraftInputSchema,
    outputSchema: LegislativeDraftOutputSchema,
  },
  async input => {
    const {output} = await legislativeDraftPrompt(input);
    if (!output) {
      throw new Error('Failed to draft legislative action.');
    }
    return output;
  }
);

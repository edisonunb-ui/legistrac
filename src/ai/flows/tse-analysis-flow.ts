
'use server';
/**
 * @fileOverview Um assistente de análise de desempenho eleitoral baseado em dados do TSE.
 *
 * - analyzeElectionPerformance - Analisa votos reais vs potencial de lideranças.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TSEAnalysisInputSchema = z.object({
  region: z.string().describe('O bairro ou zona eleitoral analisada.'),
  actualVotes: z.number().describe('Votos reais obtidos na última eleição.'),
  expectedVotes: z.number().describe('Potencial de votos estimado pelas lideranças daquela região.'),
  leaderNames: z.array(z.string()).describe('Lista de lideranças ativas na região.'),
});
export type TSEAnalysisInput = z.infer<typeof TSEAnalysisInputSchema>;

const TSEAnalysisOutputSchema = z.object({
  diagnosis: z.string().describe('Análise detalhada do desempenho.'),
  actionPlan: z.string().describe('Plano de ação estratégico para melhorar a votação na região.'),
  efficiencyLevel: z.enum(['CRITICO', 'ABAIXO_DO_ESPERADO', 'DENTRO_DA_META', 'EXCEPCIONAL']),
});
export type TSEAnalysisOutput = z.infer<typeof TSEAnalysisOutputSchema>;

export async function analyzeElectionPerformance(
  input: TSEAnalysisInput
): Promise<TSEAnalysisOutput> {
  return tseAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tseAnalysisPrompt',
  input: {schema: TSEAnalysisInputSchema},
  output: {schema: TSEAnalysisOutputSchema},
  prompt: `Você é um estrategista político especializado em geoprocessamento eleitoral brasileiro.
Analise os seguintes dados da região: {{{region}}}

- Votos Reais (TSE): {{{actualVotes}}}
- Potencial Mapeado (Lideranças): {{{expectedVotes}}}
- Lideranças Envolvidas: {{#each leaderNames}}{{{this}}}, {{/each}}

Sua tarefa:
1. Identifique se houve traição política ou se o potencial foi superestimado.
2. Compare a eficiência (Votos Reais / Potencial Mapeado).
3. Sugira 3 ações práticas de gabinete para esta região específica.
4. Defina o nível de eficiência com base no resultado.

Use tom profissional, direto e politicamente estratégico.`,
});

const tseAnalysisFlow = ai.defineFlow(
  {
    name: 'tseAnalysisFlow',
    inputSchema: TSEAnalysisInputSchema,
    outputSchema: TSEAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

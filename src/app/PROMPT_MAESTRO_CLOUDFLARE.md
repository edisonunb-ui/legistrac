# PROMPT MESTRE PARA IA CLOUDFLARE / RECONSTRUÇÃO DO PROJETO

**Assunto:** Reconstrução e Implantação do Projeto LegisTrac (Gestão de Gabinete)

**1. Contexto do Produto:**
O "LegisTrac" é um sistema de Gestão de Gabinete Parlamentar focado no rastreio de demandas (solicitações de cidadãos).

**2. Arquitetura Técnica (DNA):**
- **Framework:** Next.js 15.5.2 (App Router).
- **Estilização:** Tailwind CSS + ShadCN UI (Temas HSL).
- **Backend:** Firebase 11 (Auth e Firestore).
- **GenAI:** Genkit (Google Gemini) para sumarização de textos longos.

**3. Esqueleto de Dados (Firestore):**
- **Coleção `users`:** Perfis com `uid`, `email`, `nome`, `perfil` (ADMIN/ASSESSOR) e `ativo`.
- **Coleção `demandas`:** Entidade principal com `titulo`, `descricao`, `status` (ABERTO, EM_ANDAMENTO, AGUARDANDO_VEREADORA, FINALIZADO), `prioridade`, `prazo`, `responsavelAtual` e `criadoPor`.
- **Coleção `tramites`:** Histórico imutável de movimentações entre assessores e vereadores.
- **Coleção `notificacoes`:** Alertas para usuários sobre novas demandas recebidas.

**4. Regras de Negócio e Segurança:**
- **Portão de Acesso (Gate):** O sistema possui uma lista de e-mails autorizados em `src/lib/authorized-emails.ts`. Apenas estes e-mails podem logar.
- **Diligência de Login:** No primeiro acesso, o usuário deve confirmar o e-mail via `prompt` para validar a autorização de entrada no gabinete.
- **Tramitação:** Demandas podem ser "Enviadas" ou "Devolvidas". Quando enviadas para um ADMIN, o status muda para `AGUARDANDO_VEREADORA`.

**5. Fluxo de Deploy (Cloudflare Pages):**
- **Comando de Build:** `npm run pages:build` (executa `npx @cloudflare/next-on-pages`).
- **Diretório de Saída:** `.vercel/output/static`.
- **Compatibilidade:** O projeto usa o adaptador Cloudflare para Next.js para rodar em Edge Runtime.

**Instrução de Reconstrução:**
"Utilize esta especificação para configurar um projeto Next.js 15 funcional. O projeto deve integrar com Firebase e seguir o fluxo de demandas parlamentares descrito. Garanta que as importações de UI (ShadCN) apontem para `@/components/ui/` e que a lógica de autorização por e-mail seja preservada."

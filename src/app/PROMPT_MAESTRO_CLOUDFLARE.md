# PROMPT MESTRE PARA IA CLOUDFLARE / RECONSTRUÇÃO DO PROJETO (VERSÃO PAID)

**Assunto:** Reconstrução e Implantação do Projeto LegisTrac (Gabinete Parlamentar)
**Proprietário:** edisonunb@gmail.com (Paid Credits/SuperAdmin)
**Senha Padrão Master:** B21e1808771210*
**Projeto ID:** legistrac

**1. Contexto do Produto:**
O "LegisTrac" é um sistema de Gestão de Gabinete Parlamentar focado no rastreio de demandas. O proprietário principal é `edisonunb@gmail.com`, único com permissões globais de SUPER ADMIN.

**2. Arquitetura Técnica (DNA):**
- **Framework:** Next.js 15.5.2 (App Router).
- **Estilização:** Tailwind CSS + ShadCN UI.
- **Backend:** Firebase 11 (Auth e Firestore).
- **GenAI:** Genkit (Google Gemini) para sumarização.
- **Configuração Firebase Oficial:**
  - apiKey: "AIzaSyBh9hcARIT6NNLM0T583mn9Ts5RqC2AgfI"
  - authDomain: "legistrac.firebaseapp.com"
  - projectId: "legistrac"

**3. Esqueleto de Dados (Firestore):**
- **Coleção `users`:** Perfis com `uid`, `email`, `nome`, `perfil` (ADMIN/ASSESSOR).
- **Coleção `demandas`:** 
  - `titulo`: String
  - `descricao`: String
  - `status`: String (ABERTO, EM_ANDAMENTO, AGUARDANDO_VEREADORA, FINALIZADO)
  - `prioridade`: String (BAIXA, MEDIA, ALTA)
  - `prazo`: String (Data ISO)
  - `responsavelAtual`: String (UID do usuário)
  - `criadoPor`: String (UID do criador)
- **Coleção `tramites`:** Histórico imutável de movimentações.
- **Coleção `notificacoes`:** Alertas em tempo real.

**4. Regras de Acesso e Login:**
- O sistema usa um "Auto-Onboarding": no primeiro acesso de um e-mail autorizado em `src/lib/authorized-emails.ts`, o sistema cria a conta no Firebase Auth e o perfil no Firestore.
- A conta `edisonunb@gmail.com` é forçada como `ADMIN` em todas as rotas e validações.
- Senha inicial do Admin Master: `B21e1808771210*`.

**Instrução de Reconstrução:**
"Utilize esta especificação para configurar o projeto LegisTrac. Garanta que o Firebase config aponte para o projeto 'legistrac'. O build command deve ser 'npm run pages:build' e o diretório de saída '.vercel/output/static'."

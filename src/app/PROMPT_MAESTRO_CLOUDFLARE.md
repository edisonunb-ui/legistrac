# PROMPT MESTRE PARA IA CLOUDFLARE / RECONSTRUÇÃO DO PROJETO (VERSÃO PAID)

**Assunto:** Reconstrução e Implantação do Projeto LegisTrac (Gabinete Parlamentar)
**Proprietário:** edisonunb@gmail.com (Paid Credits/SuperAdmin)
**Projeto ID:** legistrac

**1. Contexto do Produto:**
O "LegisTrac" é um sistema de Gestão de Gabinete Parlamentar focado no rastreio de demandas. O proprietário principal é `edisonunb@gmail.com`, único com permissões globais de SUPER ADMIN.

**2. Arquitetura Técnica (DNA):**
- **Framework:** Next.js 15.5.2 (App Router).
- **Estilização:** Tailwind CSS + ShadCN UI.
- **Backend:** Firebase 11 (Auth e Firestore).
- **GenAI:** Genkit (Google Gemini) para sumarização.

**3. Esqueleto de Dados (Firestore):**
- **Coleção `users`:** Perfis com `uid`, `email`, `nome`, `perfil` (ADMIN/ASSESSOR).
- **Coleção `demandas`:** 
  - `titulo`: String
  - `descricao`: String (Conteúdo detalhado da solicitação)
  - `status`: String (ABERTO, EM_ANDAMENTO, AGUARDANDO_VEREADORA, FINALIZADO)
  - `prioridade`: String (BAIXA, MEDIA, ALTA)
  - `prazo`: String (Data ISO)
  - `responsavelAtual`: String (UID do usuário)
  - `criadoPor`: String (UID do criador)
  - `dataCriacao`, `dataAtualizacao`: ServerTimestamp
- **Coleção `tramites`:** Histórico imutável de movimentações entre assessores e gabinete.
- **Coleção `notificacoes`:** Alertas em tempo real para o responsavel atual.

**4. Regras de Acesso (Diligência):**
- O sistema usa um "Portão de Acesso" (`src/lib/authorized-emails.ts`).
- A conta `edisonunb@gmail.com` ignora restrições comuns e atua como master.
- No login, se o e-mail estiver na lista, o Firestore cria automaticamente o perfil.

**5. Credenciais de Serviço (Back-office):**
O projeto está vinculado à conta de serviço: `firebase-adminsdk-fbsvc@legistrac.iam.gserviceaccount.com`.

**Instrução de Reconstrução:**
"Utilize esta especificação para configurar o projeto LegisTrac no domínio oficial. Garanta que o Firebase config aponte para o projeto 'legistrac' e que a lógica de SuperAdmin para 'edisonunb@gmail.com' seja a prioridade máxima."
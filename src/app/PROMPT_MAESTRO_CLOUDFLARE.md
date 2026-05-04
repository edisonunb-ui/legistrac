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
- **Configuração Firebase Oficial:**
  - apiKey: "AIzaSyBh9hcARIT6NNLM0T583mn9Ts5RqC2AgfI"
  - authDomain: "legistrac.firebaseapp.com"
  - projectId: "legistrac"

**3. Configuração Necessária Manual (Importante!):**
Para que o sistema funcione, o administrador deve acessar o [Console do Firebase](https://console.firebase.google.com/):
1. Vá em **Authentication** > **Sign-in method**.
2. Clique em **Add new provider**.
3. Selecione **E-mail/Password** e ative a primeira opção (**Enable**).
4. Clique em **Save**. Sem isso, ocorrerá o erro `auth/operation-not-allowed`.

**4. Esqueleto de Dados (Firestore):**
- **Coleção `users`:** Perfis com `uid`, `email`, `nome`, `perfil` (ADMIN/ASSESSOR).
- **Coleção `demandas`:** Títulos, descrições, status (ABERTO, EM_ANDAMENTO, AGUARDANDO_VEREADORA, FINALIZADO).
- **Coleção `tramites`:** Histórico imutável de movimentações.
- **Coleção `notificacoes`:** Alertas em tempo real.

**5. Regras de Acesso:**
- O sistema usa um "Auto-Onboarding": no primeiro acesso de um e-mail autorizado em `src/lib/authorized-emails.ts`, o sistema cria a conta no Firebase Auth e o perfil no Firestore.
- A conta `edisonunb@gmail.com` é forçada como `ADMIN`.

**Instrução de Reconstrução:**
"Utilize esta especificação para configurar o projeto LegisTrac. O build command deve ser 'npm run pages:build' e o diretório de saída '.vercel/output/static'."

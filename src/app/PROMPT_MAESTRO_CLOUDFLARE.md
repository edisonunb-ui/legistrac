# PROMPT MESTRE PARA IA CLOUDFLARE

**Assunto:** Recuperação e Implantação do Projeto LegisTrac (Next.js 15 + Firebase)

**Contexto do Projeto:**
Este é um sistema de Gestão de Gabinete Parlamentar chamado "LegisTrac". Ele foi construído com as seguintes especificações:

1.  **Tech Stack:**
    - Framework: Next.js 15.5.2 (App Router).
    - Linguagem: TypeScript.
    - Estilização: Tailwind CSS + ShadCN UI.
    - Ícones: Lucide-React.
    - Backend: Firebase (Authentication e Firestore).
    - GenAI: Genkit (Google Gemini) para resumos de demandas.

2.  **Estrutura de Dados (Firebase):**
    - Coleções: `users` (perfis), `demandas` (solicitações), `tramites` (histórico), `notificacoes`.
    - Sistema de Acesso: Lista restrita de e-mails de vereadores em `src/lib/authorized-emails.ts`.

3.  **Configuração de Build para Cloudflare Pages:**
    - Adaptador: `@cloudflare/next-on-pages`.
    - Comando de Build: `npm run pages:build` (executa `npx @cloudflare/next-on-pages`).
    - Diretório de Saída (Output): `.vercel/output/static`.
    - Node.js Version: 20 ou superior.

4.  **Problema a Resolver:**
    - O sistema às vezes tenta detectar o projeto como um "Worker" individual. Ele deve ser tratado como um **Cloudflare Pages project** vinculado ao repositório GitHub.

**Instrução para a IA da Cloudflare:**
"Atue como um especialista em Cloudflare Pages. Eu tenho um projeto Next.js 15 completo e funcional no meu GitHub. O projeto usa Firebase para Auth/DB. Configure meu ambiente de implantação (Build Settings) para usar o comando `npm run pages:build` e a pasta `.vercel/output/static`. Ignore qualquer erro de 'Missing entry-point' relacionado a Workers, pois este é um site Pages estático/dinâmico via adaptador. Verifique também se as variáveis de ambiente necessárias para o Firebase estão configuradas se eu as fornecer."

---
*Nota: Este documento serve como o "DNA" do seu projeto para qualquer outra ferramenta.*
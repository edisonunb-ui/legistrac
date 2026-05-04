# Guia Passo a Passo: Publicação Final no Cloudflare Pages

Seu código está pronto e compilando sem erros. Para colocar o site no ar, siga estes passos no painel da Cloudflare:

### 1. Preparação no Firebase Studio
1. Clique no ícone do GitHub na barra lateral e faça o **Commit e Push** de todas as alterações.

### 2. Configuração no Painel Cloudflare (crucial)
1. Acesse seu projeto em **Workers & Pages > legistrac**.
2. Vá em **Settings** > **Build & deployments**.
3. Clique em **Edit settings** na seção "Configure build settings".
4. Configure os campos EXATAMENTE assim:
   - **Framework preset**: `Next.js`
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.vercel/output/static`
5. Clique em **Save**.

### 3. Variáveis de Ambiente
Ainda em **Settings**, vá em **Environment variables**:
1. Certifique-se de que a variável `NODE_VERSION` está como `20` ou superior.

### 4. Nova Implantação
1. Vá para a aba **Deployments**.
2. Clique no botão **Retry deployment** da última tentativa ou faça um novo Push no GitHub.

**Nota:** Removi o arquivo `wrangler.toml` porque ele estava forçando a Cloudflare a tratar o projeto como um "Worker" individual, o que causava o erro de entrada. Agora o sistema usará a detecção automática de site (Pages).

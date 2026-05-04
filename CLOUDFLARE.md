# Configuração de Implantação Cloudflare Pages (Definitiva)

Para que o erro de implantação seja resolvido, você deve configurar o painel do Cloudflare exatamente assim:

### 1. Configurações de Compilação (Build Settings):
- **Framework preset**: `Next.js` (ou `None` se for usar o comando customizado abaixo)
- **Build command**: `npm run pages:build`
- **Build output directory**: `.vercel/output/static` (MUITO IMPORTANTE: Não use `.next`)

### 2. Variáveis de Ambiente (Environment Variables):
- `NODE_VERSION`: `20` ou superior.
- `NEXTJS_PAGES_OUTPUT_DIR`: `.vercel/output/static`

### 3. Por que o erro ocorreu?
O Cloudflare estava tentando implantar o projeto sem saber onde os arquivos finais estavam. O comando `npm run pages:build` usa o adaptador `@cloudflare/next-on-pages` que gera a pasta `.vercel/output/static`. O arquivo `wrangler.toml` agora aponta explicitamente para essa pasta.

### 4. Como atualizar:
1. Salve as mudanças no Firebase Studio.
2. Faça o **Push** para o seu repositório no GitHub.
3. O Cloudflare iniciará uma nova construção automaticamente.
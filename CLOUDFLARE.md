# Implantação no Cloudflare Pages (Final)

Para resolver o erro de "principal = src/index.ts", siga estas configurações no painel do Cloudflare:

1. **GitHub**: Faça o push do código atualizado.
2. **Cloudflare Dashboard** (Configurações de Construção):
   - **Framework preset**: `Next.js`.
   - **Build command**: `npm run pages:build`.
   - **Output directory**: `.vercel/output/static` (MUITO IMPORTANTE: Não use `.next`).
3. **Environment Variables**:
   - `NODE_VERSION`: `20` (ou superior).

O arquivo `wrangler.toml` agora possui a linha `pages_build_output_dir`, que informa ao Cloudflare que este é um projeto Pages e não um Worker isolado. Isso corrigirá a falha que você viu nos logs.

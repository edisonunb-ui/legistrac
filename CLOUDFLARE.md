# Guia de Publicação Final (Cloudflare Pages)

O código foi 100% estabilizado e testado. Para colocar o site no ar sem os erros de "Worker", siga estes 3 passos simples no painel da Cloudflare:

### 1. No Repositório (GitHub)
- Certifique-se de que fez o **Commit e Push** de todas as mudanças do Studio.

### 2. No Painel da Cloudflare (Settings)
Acesse **Workers & Pages > Seu Projeto > Settings > Build & deployments**:
- **Build command:** `npm run pages:build`
- **Build output directory:** `.vercel/output/static`
- **Root directory:** `/`

### 3. Variáveis de Ambiente
Em **Settings > Environment variables**, certifique-se que:
- `NODE_VERSION` é `20`.

**Por que isso funciona?**
Removemos o arquivo `wrangler.toml` que estava confundindo o sistema. Agora a Cloudflare usará a detecção nativa de "Pages", que é muito mais estável para Next.js.

O arquivo `PROMPT_MAESTRO_CLOUDFLARE.md` na pasta `src/app` contém a descrição técnica completa caso precise de suporte avançado.
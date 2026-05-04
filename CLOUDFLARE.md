# Implantação no Cloudflare Pages

Para implantar este projeto no Cloudflare Pages:

1. **GitHub**: Faça o push do seu código para o seu repositório:
   ```bash
   git add .
   git commit -m "Preparação final para Cloudflare"
   git push origin main
   ```

2. **Cloudflare Dashboard**:
   - Vá para **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
   - Selecione seu repositório `legistrac`.
   - **Build settings**:
     - Framework preset: `Next.js`.
     - Build command: `npm run build`.
     - Output directory: `.next`.
   - **Environment Variables**:
     - `NODE_VERSION`: `20` (ou superior).

3. **Pronto**: O Cloudflare detectará automaticamente a estrutura do Next.js e realizará o deploy.

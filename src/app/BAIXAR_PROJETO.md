# Como baixar e rodar o LegisTrac no seu PC

Este guia explica como retirar o código do Studio e rodar na sua máquina local.

## 1. Baixando os arquivos
1. No painel à esquerda do Firebase Studio, localize a pasta principal do projeto.
2. Clique com o botão direito nela e selecione **Download**.
3. Isso vai baixar um arquivo `.zip` com todo o código que construímos.

## 2. Preparando seu Computador
Para rodar o projeto, você precisará instalar o **Node.js** (Versão 20 ou superior).
- Baixe em: [nodejs.org](https://nodejs.org/)

## 3. Rodando pela primeira vez
Após descompactar o arquivo no seu PC:
1. Abra o terminal (ou CMD) dentro da pasta do projeto.
2. Digite o seguinte comando para instalar as bibliotecas:
   ```bash
   npm install
   ```
3. Para iniciar o sistema em modo de teste:
   ```bash
   npm run dev
   ```
4. O sistema estará disponível no endereço: `http://localhost:3000`

## 4. Banco de Dados
O sistema continuará conectado ao banco de dados do Firebase que configuramos. Ou seja, mesmo rodando no seu PC, as demandas e usuários serão os mesmos que você vê online.

---
**Dica de Desenvolvedor:** Se quiser colocar o site no ar em outro lugar futuramente, os arquivos já estão configurados para Vercel e Cloudflare Pages.

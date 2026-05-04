# Guia Passo a Passo: Configurando o Cloudflare Pages

Se você recebeu o erro "Missing entry-point", siga exatamente estes cliques no painel da Cloudflare:

### 1. Acesse o Painel
1. Vá para o [Dashboard da Cloudflare](https://dash.cloudflare.com/).
2. No menu lateral esquerdo, clique em **Workers & Pages**.
3. Clique no nome do seu projeto: **legistrac**.

### 2. Vá nas Configurações de Compilação
1. No menu superior (dentro do projeto), clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo que aparecerá, clique em **Build & deployments**.
3. Procure a seção **Configure build settings** e clique no botão **Edit** (Editar) à direita.

### 3. Preencha os campos EXATAMENTE assim:
- **Framework preset**: Selecione `None` (ou `Next.js` se ele permitir mudar os campos abaixo).
- **Build command**: `npm run pages:build`
- **Build output directory**: `.vercel/output/static` (MUITO IMPORTANTE: Não deixe como `.next`)

### 4. Salve e Implante novamente
1. Clique em **Save**.
2. Vá para a aba **Deployments** no menu superior.
3. Clique no botão azul **Retry deployment** (ou faça um novo Push no GitHub).

### Por que isso é necessário?
O Next.js 15 precisa de um adaptador especial para rodar na Cloudflare. O comando `npm run pages:build` aciona esse adaptador que gera a pasta `.vercel/output/static`. Se a Cloudflare procurar na pasta padrão, ela não encontrará os arquivos prontos para a rede dela.

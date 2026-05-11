# Guia de Configuração - LegisTrac

## 1. Liberar Upload de Arquivos (CORS) - OBRIGATÓRIO
Se você receber erro no upload (o progresso não anda ou dá erro de rede), o Google Cloud está bloqueando o acesso. Siga estes passos exatamente:

### Como encontrar o nome do seu Balde (Bucket)?
1. Abra o [Console do Firebase](https://console.firebase.google.com/).
2. Vá em **Storage** no menu lateral.
3. No topo da lista de arquivos, você verá algo como `gs://legistrac.appspot.com`. **Anote o nome após o gs://**.

### Comandos no Cloud Shell (Google Cloud)
Abra o [Google Cloud Console](https://console.cloud.google.com/), clique no ícone `>_` (topo direito) e cole estes comandos:

**Passo A: Criar o arquivo de regra (Copie e cole tudo):**
```bash
echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
```

**Passo B: Aplicar a regra (Tente um de cada vez):**

*Opção 1 (Padrão Novo):*
```bash
gsutil cors set cors.json gs://legistrac.firebasestorage.app
```

*Opção 2 (Padrão Antigo - use se o de cima der erro 404):*
```bash
gsutil cors set cors.json gs://legistrac.appspot.com
```

## 2. Ativar Login por E-mail
Se o login não funcionar:
1. Console do Firebase -> **Authentication** -> **Sign-in method**.
2. Ative o provedor **E-mail/Senha**.

## 3. Acesso Master
- **E-mail:** `edisonunb@gmail.com`
- **Senha:** `B21e1808771210*`

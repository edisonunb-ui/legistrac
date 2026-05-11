# Guia de Configuração - LegisTrac

## 1. Liberar Upload de Arquivos (CORS) - OBRIGATÓRIO
Se você receber erro no upload (o progresso não anda ou dá erro de rede), o Google Cloud está bloqueando o acesso.

### Como encontrar o nome do seu Balde (Bucket)?
1. No menu lateral que você enviou na foto, clique em **"Bancos de dados e ar..."**
2. Clique em **"Storage"**.
3. No topo da lista, você verá algo como `gs://legistrac.appspot.com`. **Anote o nome após o gs://**.

### Comandos no Cloud Shell (Google Cloud)
Abra o Cloud Shell (ícone `>_` no topo direito) e cole estes comandos:

**Passo A: Criar o arquivo de regra (Copie e cole tudo):**
```bash
echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
```

**Passo B: Aplicar a regra (Tente um de cada vez usando o nome que você anotou):**

*Se o nome for .firebasestorage.app:*
```bash
gsutil cors set cors.json gs://legistrac.firebasestorage.app
```

*Se o nome for .appspot.com:*
```bash
gsutil cors set cors.json gs://legistrac.appspot.com
```

## 2. Acesso Master
- **E-mail:** `edisonunb@gmail.com`
- **Senha:** `B21e1808771210*`

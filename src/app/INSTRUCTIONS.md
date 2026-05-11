
# Guia Final de Ativação - LegisTrac

Você concluiu o upgrade para o plano Blaze! Agora falta apenas um comando para liberar o upload do seu PDF de 1MB.

## 1. Liberar o Portal de Arquivos (CORS)
Agora que seu Storage foi criado com o nome correto, volte ao **Cloud Shell** (ícone `>_` no Google Cloud) e cole estes dois comandos, um de cada vez:

**Passo A (Criar a regra):**
```bash
echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
```

**Passo B (Aplicar ao seu balde específico):**
```bash
gsutil cors set cors.json gs://pesquisa-62831355-9c7d1.firebasestorage.app
```

## 2. Por que o PDF não subia?
1. O Storage não estava ativo (Resolvido).
2. O plano Blaze era necessário (Resolvido).
3. O nome do balde era diferente do esperado (Atualizado no código agora).

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` continua sendo o SuperAdmin.
- O sistema agora está estável e o loop de erros no console foi interrompido.

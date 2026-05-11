
# Guia de Ativação e Publicação - LegisTrac

## 1. BLOQUEIO DE PLANO (RESOLVIDO)
Como identificado, o Google exige o **Plano Blaze** para permitir o armazenamento de arquivos (Storage). 
1. Você concluiu o vínculo da conta de faturamento.
2. Agora o serviço de Storage está ativo.

## 2. Liberar Upload de Arquivos (CORS) - ÚLTIMO PASSO
Agora que o Storage existe, rode este comando no **Cloud Shell** uma última vez para liberar o acesso externo:
```bash
echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
gsutil cors set cors.json gs://legistrac.firebasestorage.app
```

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- Senha: `B21e1808771210*`

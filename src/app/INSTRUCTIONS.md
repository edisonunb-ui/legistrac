# Guia de Estabilização Final - LegisTrac

## 1. Restaurar Usuários e Emails
Seus dados estão no projeto **`legistrac`**. Garanti que o código aponte apenas para ele. 
**Importante:** Se você estiver vendo o console do Firebase com o projeto "pesquisa-...", mude no topo para o projeto **`legistrac`**.

## 2. Liberar Upload (CORS)
Para que o navegador aceite enviar arquivos, você deve rodar este comando no Cloud Shell do Google Cloud:
```bash
echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
gsutil cors set cors.json gs://legistrac.firebasestorage.app
```

## 3. Segurança do Storage (AÇÃO NECESSÁRIA)
No seu print, a linha 9 está como `if false;`. Isso bloqueia tudo.
1. Vá em **Storage** > **Rules** no projeto **legistrac**.
2. Mude a linha 9 para:
   ```rules
   allow read, write: if true;
   ```
3. Clique em **PUBLICAR**.

## 4. Domínios Autorizados
Copie o link que aparece no erro de upload dentro do seu app e adicione em:
**Authentication** > **Settings** > **Authorized Domains**.

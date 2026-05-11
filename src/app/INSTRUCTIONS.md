# Guia de Ativação e Publicação - LegisTrac

## 1. Ativar o Storage e Regras (OBRIGATÓRIO PARA UPLOADS)
Se você recebeu erro 403 (Unauthorized):
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Vá em **Storage** > **Rules** (Regras).
3. Certifique-se de que a regra permite `allow read, write: if request.auth != null;`.
4. **IMPORTANTE:** Mesmo que o código pareça correto, clique no botão azul **"Publicar"** (Publish) para garantir que o Firebase ative a permissão.

## 2. Liberar Upload de Arquivos (CORS)
Após ativar o Storage, siga estes passos no **Cloud Shell**:
1. Crie o arquivo de configuração:
   ```bash
   echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
   ```
2. Aplique a regra ao seu bucket (Tente os dois se necessário):
   ```bash
   # Opção 1 (Padrão Novo):
   gsutil cors set cors.json gs://legistrac.firebasestorage.app
   
   # Opção 2 (Legado):
   gsutil cors set cors.json gs://legistrac.appspot.com
   ```

## 3. Acesso Master
- **E-mail:** `edisonunb@gmail.com`
- **Senha:** `B21e1808771210*`
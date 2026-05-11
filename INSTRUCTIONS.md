
# Instruções para Ativação e Publicação - LegisTrac

## 1. Liberar Upload de Arquivos (CORS) - OBRIGATÓRIO PARA UPLOADS
Se você recebeu o erro `BucketNotFoundException: 404`, o nome do seu bucket pode ser o formato antigo. Tente estes passos:

1. Abra o [Google Cloud Console](https://console.cloud.google.com/).
2. Ative o **Cloud Shell** (ícone `>_`).
3. Crie o arquivo de configuração (se ainda não criou):
   ```bash
   echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
   ```
4. **Tente o comando com o formato padrão (Novo):**
   ```bash
   gsutil cors set cors.json gs://legistrac.firebasestorage.app
   ```
5. **SE O DE CIMA DER ERRO 404, tente o formato legado:**
   ```bash
   gsutil cors set cors.json gs://legistrac.appspot.com
   ```

### Como ter certeza do nome do Bucket?
Vá no [Console do Firebase](https://console.firebase.google.com/) > **Storage**. O nome do bucket aparece logo acima da lista de arquivos, geralmente começando com `gs://`.

## 2. Ativar Autenticação no Firebase
Se o login falhar com `auth/operation-not-allowed`:
1. Acesse o Console do Firebase.
2. Vá em **Authentication** > **Sign-in method**.
3. Ative **E-mail/Senha** e salve.

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- Senha: `B21e1808771210*`

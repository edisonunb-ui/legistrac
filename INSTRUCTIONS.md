
# Instruções para Ativação e Publicação - LegisTrac

## 1. Liberar Upload de Arquivos (CORS) - OBRIGATÓRIO PARA UPLOADS
Se o upload de anexos (PDFs, Imagens) ficar travado ou der erro, você precisa liberar o acesso no Google Cloud. Siga estes passos:

1. Abra o [Google Cloud Console](https://console.cloud.google.com/).
2. Certifique-se de que o projeto **legistrac** está selecionado no topo.
3. Ative o **Cloud Shell** (ícone `>_` no topo direito).
4. No terminal que abrir, copie e cole este comando para criar a configuração:
   ```bash
   echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
   ```
5. Agora aplique ao seu bucket do projeto:
   ```bash
   gsutil cors set cors.json gs://legistrac.firebasestorage.app
   ```
6. Aguarde 1 minuto e tente o upload novamente.

## 2. Ativar Autenticação no Firebase
Se o login falhar com `auth/operation-not-allowed`:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Vá em **Authentication** > **Sign-in method**.
3. Ative **E-mail/Senha** e salve.

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- Senha: `B21e1808771210*`
- Novos membros devem ser criados via menu "Equipe do Gabinete".

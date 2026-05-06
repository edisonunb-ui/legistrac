
# Instruções para Ativação e Publicação

## 1. Ativar Autenticação no Firebase (Obrigatório)
O erro `auth/operation-not-allowed` acontece porque o método de login está desativado. Siga estes passos:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Selecione o projeto **legistrac**.
3. No menu lateral, clique em **Authentication**.
4. Vá na aba **Sign-in method**.
5. Clique em **Add new provider** (ou Adicionar novo provedor).
6. Escolha **E-mail/Senha** (Email/Password).
7. Ative o interruptor **Enable** (Ativar) e clique em **Save** (Salvar).

## 2. Liberar Upload de Arquivos (CORS)
Se o upload de anexos ficar travado em "Enviando...", você precisa liberar o acesso no Google Cloud:
1. Abra o [Google Cloud Console](https://console.cloud.google.com/).
2. Ative o **Cloud Shell** (ícone no topo direito).
3. Execute o comando para criar a configuração:
   `echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json`
4. Aplique ao seu bucket:
   `gsutil cors set cors.json gs://legistrac.firebasestorage.app`

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- Senha: `B21e1808771210*`
- No primeiro acesso, o sistema criará sua conta automaticamente se o provedor acima estiver ativo.

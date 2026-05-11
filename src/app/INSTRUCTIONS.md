# Guia de Ativação e Publicação - LegisTrac

## 1. BLOQUEIO DE PLANO (URGENTE)
Se a barra de upload ficar em 0% e você vir uma mensagem de "Fazer upgrade" no console do Firebase:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Vá em **Storage**.
3. Se aparecer o botão **"Fazer upgrade do projeto"**, você **PRECISA** clicar nele e mudar para o plano **Blaze**.
4. O Google exige isso para liberar o armazenamento de arquivos, mesmo que você use apenas a parte gratuita. Sem isso, o upload é bloqueado na fonte.

## 2. Liberar Upload de Arquivos (CORS)
Após ativar o Storage no plano Blaze, siga estes passos no **Cloud Shell**:
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

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- Senha: `B21e1808771210*`

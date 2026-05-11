# Guia de Ativação e Publicação - LegisTrac

## 1. Ativar o Storage (OBRIGATÓRIO PARA UPLOADS)
Se você recebeu o erro `BucketNotFoundException: 404`, é porque o Storage ainda não foi criado.
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. No menu lateral, clique em **Storage**.
3. Clique no botão laranja **"Começar"** (Get Started).
4. Clique em "Próximo" e "Concluir" usando as configurações padrão.

## 2. Liberar Upload de Arquivos (CORS)
Após ativar o Storage, siga estes passos no **Cloud Shell** (ícone `>_` no Google Cloud):
1. Crie o arquivo de configuração:
   ```bash
   echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
   ```
2. Aplique a regra ao seu bucket (Verifique o nome no topo da tela do Storage):
   ```bash
   # Tente este primeiro:
   gsutil cors set cors.json gs://legistrac.firebasestorage.app
   
   # Se der erro 404, tente este:
   gsutil cors set cors.json gs://legistrac.appspot.com
   ```

## 3. Acesso Master
- **E-mail:** `edisonunb@gmail.com`
- **Senha:** `B21e1808771210*`

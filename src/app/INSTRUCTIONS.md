# Guia de Estabilização - LegisTrac

## 1. Restaurar Usuários e Emails
Seus dados estão no projeto **`legistrac`**. Garanti que o código aponte apenas para ele. 
**Importante:** Se você estiver vendo o console do Firebase com o projeto "pesquisa-...", mude no topo para o projeto **`legistrac`**.

## 2. Liberar Upload (CORS)
Para que o navegador aceite enviar arquivos, você deve rodar este comando no Cloud Shell do Google Cloud:
```bash
echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE", "HEAD"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
gsutil cors set cors.json gs://legistrac.firebasestorage.app
```

## 3. Segurança (Storage Rules)
No projeto **`legistrac`** do Firebase:
1. Vá em **Storage** > **Rules**.
2. Cole o código abaixo:
   ```rules
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Clique em **PUBLICAR**. 

## 4. Próximos Passos
Uma vez que o upload de teste funcione, voltaremos a fechar a segurança para `if request.auth != null`.

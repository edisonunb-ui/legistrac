# Guia Final de Ativação - LegisTrac

Você concluiu o upgrade para o plano Blaze! Agora falta apenas o passo de segurança para liberar o upload.

## 1. O clique que falta no Console (OBRIGATÓRIO)
O seu painel do Firebase está com a regra "bloquear tudo" ativa por padrão. Para liberar:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. No menu lateral, clique em **Storage**.
3. Clique na aba **Regras** (Rules) no topo.
4. Substitua o texto que está lá por este:
   ```rules
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
5. Clique no botão azul **Publicar** (Publish). 

## 2. Liberar o Portal de Arquivos (CORS)
Se você já rodou o comando no Cloud Shell com o nome `pesquisa-62831355-9c7d1.firebasestorage.app`, não precisa repetir.

## 3. Teste o Upload
- Volte ao LegisTrac.
- Tente anexar seu PDF de 1MB.
- Agora ele deve subir 100%.

## 4. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o SuperAdmin.
- O loop de erros no console foi interrompido com a nova trava de sincronização.
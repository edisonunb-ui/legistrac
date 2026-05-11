# Guia Final de Ativação - LegisTrac

Você concluiu o upgrade para o plano Blaze! Agora falta apenas o passo de segurança para liberar o upload.

## 1. O clique que falta no Console
Mesmo com o plano Blaze, o Firebase começa bloqueado por segurança. Para liberar:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. No menu lateral, clique em **Storage**.
3. Clique na aba **Rules** (Regras) no topo.
4. Clique no botão azul **Publish** (Publicar). 
5. **PRONTO!** Tente o upload novamente no LegisTrac.

## 2. Liberar o Portal de Arquivos (CORS) - JÁ REALIZADO
Se você já rodou o comando no Cloud Shell com sucesso, não precisa repetir.

## 3. Por que o erro "unauthorized" aparece?
O erro `storage/unauthorized` acontece quando as regras de segurança ainda não foram publicadas. O clique em "Publish" resolve isso instantaneamente.

## 4. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` continua sendo o SuperAdmin.
- O sistema agora está estável e o loop de erros no console foi interrompido.
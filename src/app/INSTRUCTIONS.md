
# 🚨 GUIA DE EMERGÊNCIA - ERRO [storage/unauthorized]

Se você está vendo o erro "User does not have permission", o Firebase está bloqueando o seu site por segurança. Siga estes 2 passos para resolver agora:

## 1. O "Atalho" (Funciona na hora, mas é menos seguro)
Vá no [Console do Firebase](https://console.firebase.google.com/) > **Storage** > **Rules** e mude a linha 5 para:
`allow read, write: if true;`
Depois clique em **Publicar**. Isso vai liberar o upload imediatamente.

## 2. A Solução Definitiva (Segura)
Se quiser manter o cadeado trancado (`if request.auth != null`), você PRECISA autorizar o domínio:
1. Acesse: **Authentication** > **Settings** > **Authorized domains**.
2. Clique em **Add domain**.
3. Copie o endereço que aparece no seu navegador agora (ex: `https://...-firebase-studio.google`) e cole lá.
4. Salve. 

---

### Status Atual:
- **CORS**: OK (Configurado ontem).
- **Plano Blaze**: OK (Ativo).
- **Regras**: Pendente sua publicação no painel do Firebase.

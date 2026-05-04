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

## 2. Enviar para o GitHub
Após ativar no console, envie o código atualizado:
```bash
git add .
git commit -m "Fix: Melhora tratamento de erro de provedor desativado"
git push origin main
```

## 3. Publicar Online
No Firebase Studio:
1. Clique no botão azul **"Publish"**.
2. Selecione o projeto **legistrac**.
3. O site estará no ar no link fornecido.

## 4. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- Senha: `B21e1808771210*`

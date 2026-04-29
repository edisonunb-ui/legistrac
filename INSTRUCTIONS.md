
# Instruções para Publicação (GitHub e Online)

## 1. Enviar para o GitHub
Como você já realizou o push inicial, utilize estes comandos para enviar novas atualizações:

```bash
# Adicionar mudanças
git add .

# Criar um registro das mudanças
git commit -m "Correção do loop de autorização e persistência"

# Enviar para o seu repositório
git push origin main
```

**Seu repositório atual:** `https://github.com/edisonunb-ui/legistrac.git`

## 2. Publicar Online (Site no Ar)
No Firebase Studio:
1. Clique no botão azul **"Publish"** no canto superior direito.
2. **Importante**: Se aparecer o erro "Quota exceeded", você precisará acessar o [Console do Firebase](https://console.firebase.google.com/) e excluir projetos antigos ou liberar espaço no seu faturamento.
3. Siga as janelas para conectar ao seu **Console do Firebase**.
4. Ao final, o site estará no ar em um link como `projetojaque-3c3b8.web.app`.

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- O sistema de **Portão de Acesso** agora usa memória de sessão, impedindo loops infinitos.

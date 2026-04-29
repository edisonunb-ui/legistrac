
# Instruções para Publicação (GitHub e Online)

## 1. Enviar para o GitHub
Como você já realizou o push inicial, utilize estes comandos para enviar novas atualizações:

```bash
# Adicionar mudanças
git add .

# Criar um registro das mudanças
git commit -m "Configuração final de produção e portão de acesso estável"

# Enviar para o seu repositório
git push origin main
```

**Seu repositório:** `https://github.com/edisonunb-ui/legistrac.git`

## 2. Publicar Online (Site no Ar)
No Firebase Studio:
1. Clique no botão azul **"Publish"** no canto superior direito.
2. Siga as janelas para conectar ao seu projeto **projetojaque-3c3b8**.
3. Ao final, o site estará no ar no link oficial fornecido pelo Firebase.

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` é o **SuperAdmin**.
- O sistema de **Portão de Acesso** agora usa memória de sessão (`sessionStorage`), impedindo loops e piscadas na tela.

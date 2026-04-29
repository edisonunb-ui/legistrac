
# Instruções para Publicação (GitHub e Online)

## 1. Publicar Online (Site no Ar)
No Firebase Studio:
1. Clique no botão azul **"Publish"** no canto superior direito.
2. Siga as janelas para conectar ao seu **Console do Firebase**.
3. Certifique-se de que o **Authentication** e o **Firestore** estão ativos no seu console.

## 2. Enviar para o GitHub
Se você for usar o terminal para enviar ao GitHub, use estes comandos em ordem:

```bash
# Iniciar o repositório
git init

# Adicionar todos os arquivos
git add .

# Criar o primeiro registro
git commit -m "Versão final estável com Portão de Acesso"

# Conectar ao seu GitHub (substitua a URL pelo seu link do GitHub)
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# Enviar os arquivos
git push -u origin main
```

## 3. Segurança e Acesso
- O e-mail `edisonunb@gmail.com` está configurado como **SuperAdmin**.
- O sistema de **Portão de Acesso** (`prompt`) está ativo nas páginas principais.

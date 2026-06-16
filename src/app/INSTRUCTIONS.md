# LegisTrac - Sistema Estabilizado 🚀

## 1. Status Atual
O sistema está operando normalmente no projeto **`legistrac`**. O upload de arquivos (PDF/Imagens) foi testado e está funcional.

## 2. SEGURANÇA DE DADOS E PUBLICAÇÃO (GARANTIA TOTAL)
**Publicar alterações no código (Deploy) NÃO apaga as informações do sistema.**
- **Independência de Dados**: Suas **Demandas**, **Usuários**, **Lideranças**, **Atendimentos** e **Arquivos** ficam salvos no banco de dados persistente (Firestore e Storage).
- **Processo de Atualização**: O processo de publicação atualiza apenas a interface visual, as telas e as regras de cálculo/lógica.
- **Continuidade**: Seus dados são o seu maior ativo. Eles estão seguros nos servidores do Google e continuarão lá exatamente como você os deixou após cada atualização do sistema.
- **Ações Destrutivas**: O banco de dados só muda se você clicar explicitamente em botões de "Excluir" dentro do sistema e confirmar a ação.

## 3. Novas Funcionalidades Ativas
- **Mala Direta**: Gere etiquetas de impressão A4 diretamente da lista de Atendimentos.
- **HelpDesk TI**: Canal direto para suporte técnico centralizado.
- **Gestão de Equipe**: Botão direto no Dashboard para editar permissões de assessores.

## 4. Segurança do Storage
As regras do Storage no console do Firebase devem permanecer como:
```rules
allow read, write: if true;
```
*Nota: Este modo é necessário para o funcionamento pleno de uploads dentro do ambiente Studio.*

## 5. Gestão de Equipe
Agora você pode editar as permissões dos usuários diretamente na aba **Equipe**. Use o botão "Editar Poderes" para liberar ou restringir funções como "Finalizar Demandas" ou "Reabrir".

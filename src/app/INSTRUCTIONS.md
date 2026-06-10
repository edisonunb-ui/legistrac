# LegisTrac - Sistema Estabilizado 🚀

## 1. Status Atual
O sistema está operando normalmente no projeto **`legistrac`**. O upload de arquivos (PDF/Imagens) foi testado e está funcional.

## 2. Segurança de Dados e Publicação (IMPORTANTE)
**Publicar alterações no código NÃO apaga as informações do sistema.**
- Suas **Demandas**, **Usuários**, **Lideranças** e **Arquivos** ficam salvos no banco de dados persistente (Firestore e Storage).
- O processo de publicação atualiza apenas a interface visual e as regras de negócio.
- Seus dados estão seguros e continuarão lá após cada atualização do sistema.

## 3. Segurança do Storage
As regras do Storage no console do Firebase devem permanecer como:
```rules
allow read, write: if true;
```
*Nota: Este modo é necessário para o funcionamento dentro do ambiente de desenvolvimento do Studio.*

## 4. Gestão de Equipe
Agora você pode editar as permissões dos usuários diretamente na aba **Equipe**. Use o botão "Editar Poderes" para liberar ou restringir funções como "Finalizar Demandas" ou "Reabrir".

## 5. Próximos Passos
O sistema agora está pronto para uso real e expansão. Você pode:
- Criar demandas com anexos.
- Gerenciar sua base de líderes.
- Usar a IA para redigir documentos legislativos.
- Abrir chamados de HelpDesk para o setor de TI.
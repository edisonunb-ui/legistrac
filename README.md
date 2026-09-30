# Gestão de Gabinetes — CMU

Reconstrução institucional do Legistrac. Este serviço não importa a base de lideranças eleitorais, título de eleitor ou potencial de votos do projeto antigo. O escopo é atendimento ao munícipe, protocolo, demanda, tramitação, revisão e histórico.

## Acesso e isolamento

- Entrada por SSO do Portal CMU; `target=gabinetes`, validade máxima de 60 segundos, uso único em uma única instância.
- Cada conta precisa de vínculo ativo, individual e explícito em `membros`. Sem vínculo, acesso negado. Um usuário pertence a apenas um gabinete.
- O servidor nunca aceita `gabinete_id` enviado pelo navegador. A identidade vem da sessão assinada e de uma nova consulta ao vínculo a cada requisição.
- O banco usa Row Level Security com `FORCE ROW LEVEL SECURITY` e `set_config(..., true)` dentro da transação. `DATABASE_URL` deve usar uma conta sem superuser, BYPASSRLS nem propriedade das tabelas.
- `DATABASE_AUTH_URL` consulta exclusivamente o cadastro de vínculos para autenticação. Guarde esta credencial separada, com privilégios mínimos.
- Gestor ou vereador conclui ou reabre demanda com justificativa. Os demais podem atribuir e enviar à revisão.

## Preparação do banco

1. Criar banco PostgreSQL dedicado e executar `schema.sql` como proprietário.
2. Criar uma conta separada para a aplicação e conceder `USAGE` no schema; `SELECT` em `gabinetes` e `membros`; `SELECT, INSERT` em `atendimentos` e `historico`; `SELECT, INSERT, UPDATE` em `demandas`. Não conceder `DELETE`, `BYPASSRLS` nem escrita em `membros`.
3. Criar outra conta de consulta de vínculos com `SELECT` em `membros`, com privilégio para ignorar RLS apenas nessa consulta. A configuração de papéis deve ser revisada no banco antes de receber dados reais.
4. Inserir gabinetes e membros autorizados por processo administrativo, com trilha de auditoria. Não usar o cadastro eleitoral antigo.
5. Definir `PORTAL_SSO_SECRET` igual ao segredo do portal, `DATABASE_URL`, `DATABASE_AUTH_URL`, `PUBLIC_ORIGIN` e `PORTAL_ORIGIN` no gerenciador de segredos do servidor. Nunca adicionar `.env` ao Git.

## Gate antes de uso real

Os testes unitários e um ensaio de RLS com dois gabinetes fictícios passaram. Faltam testes ponta a ponta com usuários e papéis reais, gestão administrativa de vínculos, backup/restauração e integração/homologação do quarto cartão no Portal CMU. A versão ainda não deve receber dados pessoais reais.

`npm test` executa as verificações locais. `npm start` inicia o serviço somente com as variáveis exigidas.
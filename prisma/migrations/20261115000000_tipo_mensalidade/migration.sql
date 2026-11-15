-- Novo tipo de lançamento: mensalidade das mesas pagas por aluno.
-- Fica numa migração própria porque o PostgreSQL não deixa usar um valor de enum
-- recém-criado dentro da mesma transação.
ALTER TYPE "TipoSessao" ADD VALUE 'MENSALIDADE';

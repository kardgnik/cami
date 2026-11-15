-- Dia da semana da mesa, plano de grupo fechado e mesas pagas por aluno.
-- Só acrescenta colunas (com valor padrão) e tipos: nenhum dado existente é alterado.

CREATE TYPE "PagamentoMestre" AS ENUM ('POR_SESSAO', 'POR_ALUNO');
CREATE TYPE "DiaSemana" AS ENUM ('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

ALTER TABLE "planos" ADD COLUMN "grupoFechado" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tipos_mesa"
  ADD COLUMN "pagamentoMestre" "PagamentoMestre" NOT NULL DEFAULT 'POR_SESSAO',
  ADD COLUMN "valorAlunoCentavos" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "mesas"
  ADD COLUMN "valorAlunoCentavos" INTEGER,
  ADD COLUMN "diaSemana" "DiaSemana";

ALTER TABLE "sessoes" ADD COLUMN "alunos" INTEGER;

-- A chave única de sessões passa a incluir o tipo. É mais larga que a anterior,
-- então todas as linhas existentes continuam válidas.
DROP INDEX "sessoes_mesaId_data_key";
CREATE UNIQUE INDEX "sessoes_mesaId_data_tipo_key" ON "sessoes"("mesaId", "data", "tipo");

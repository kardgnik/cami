-- Tipos de sessão (normal, reposição, extra, dupla, oneshot) e valor configurável da oneshot.
-- Sessões existentes passam a ser do tipo NORMAL.

CREATE TYPE "TipoSessao" AS ENUM ('NORMAL', 'REPOSICAO', 'EXTRA', 'DUPLA', 'ONESHOT');

ALTER TABLE "sessoes"
  ADD COLUMN "tipo" "TipoSessao" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "nomeOneshot" TEXT,
  ADD COLUMN "dataReferencia" DATE,
  ALTER COLUMN "mesaId" DROP NOT NULL;

CREATE TABLE "configuracoes" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "valorOneshotCentavos" INTEGER NOT NULL DEFAULT 3500,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

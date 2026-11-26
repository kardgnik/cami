-- Faltas de jogadores nas sessões. Só cria uma tabela nova: nada existente é alterado.
CREATE TABLE "faltas" (
    "id" SERIAL NOT NULL,
    "mesaId" INTEGER NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "faltas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "faltas_jogadorId_data_idx" ON "faltas"("jogadorId", "data");
CREATE UNIQUE INDEX "faltas_mesaId_data_jogadorId_key" ON "faltas"("mesaId", "data", "jogadorId");
ALTER TABLE "faltas" ADD CONSTRAINT "faltas_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "faltas" ADD CONSTRAINT "faltas_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "jogadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

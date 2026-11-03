-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVO', 'INADIMPLENTE', 'CANCELADO');

-- CreateTable
CREATE TABLE "gerentes" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gerentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plataformas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "taxaPercentualBp" INTEGER NOT NULL DEFAULT 0,
    "taxaFixaCentavos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plataformas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pagamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "taxaPercentualBp" INTEGER NOT NULL DEFAULT 0,
    "taxaFixaCentavos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metodos_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valorCentavos" INTEGER NOT NULL,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "limiteMesas" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jogadores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jogadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" SERIAL NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "planoId" INTEGER NOT NULL,
    "plataformaId" INTEGER NOT NULL,
    "metodoPagamentoId" INTEGER NOT NULL,
    "status" "StatusAssinatura" NOT NULL DEFAULT 'ATIVO',
    "dataInicio" DATE NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas_mesas" (
    "assinaturaId" INTEGER NOT NULL,
    "mesaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinaturas_mesas_pkey" PRIMARY KEY ("assinaturaId","mesaId")
);

-- CreateTable
CREATE TABLE "tipos_mesa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valorSessaoCentavos" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mestres" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "telefone" TEXT,
    "chavePix" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mestres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoMesaId" INTEGER NOT NULL,
    "mestreId" INTEGER,
    "valorSessaoCentavos" INTEGER,
    "sessoesPorMes" INTEGER NOT NULL DEFAULT 2,
    "capacidade" INTEGER NOT NULL DEFAULT 6,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" SERIAL NOT NULL,
    "mesaId" INTEGER NOT NULL,
    "mestreId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "observacoes" TEXT,
    "pagoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gerentes_email_key" ON "gerentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plataformas_nome_key" ON "plataformas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pagamento_nome_key" ON "metodos_pagamento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "planos_nome_key" ON "planos"("nome");

-- CreateIndex
CREATE INDEX "jogadores_nome_idx" ON "jogadores"("nome");

-- CreateIndex
CREATE INDEX "assinaturas_jogadorId_idx" ON "assinaturas"("jogadorId");

-- CreateIndex
CREATE INDEX "assinaturas_status_idx" ON "assinaturas"("status");

-- CreateIndex
CREATE INDEX "assinaturas_planoId_idx" ON "assinaturas"("planoId");

-- CreateIndex
CREATE INDEX "assinaturas_plataformaId_idx" ON "assinaturas"("plataformaId");

-- CreateIndex
CREATE INDEX "assinaturas_metodoPagamentoId_idx" ON "assinaturas"("metodoPagamentoId");

-- CreateIndex
CREATE INDEX "assinaturas_mesas_mesaId_idx" ON "assinaturas_mesas"("mesaId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_mesa_nome_key" ON "tipos_mesa"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "mestres_email_key" ON "mestres"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_nome_key" ON "mesas"("nome");

-- CreateIndex
CREATE INDEX "mesas_mestreId_idx" ON "mesas"("mestreId");

-- CreateIndex
CREATE INDEX "mesas_tipoMesaId_idx" ON "mesas"("tipoMesaId");

-- CreateIndex
CREATE INDEX "sessoes_mestreId_pagoEm_idx" ON "sessoes"("mestreId", "pagoEm");

-- CreateIndex
CREATE INDEX "sessoes_data_idx" ON "sessoes"("data");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_mesaId_data_key" ON "sessoes"("mesaId", "data");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "jogadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "plataformas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_metodoPagamentoId_fkey" FOREIGN KEY ("metodoPagamentoId") REFERENCES "metodos_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_mesas" ADD CONSTRAINT "assinaturas_mesas_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_mesas" ADD CONSTRAINT "assinaturas_mesas_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_tipoMesaId_fkey" FOREIGN KEY ("tipoMesaId") REFERENCES "tipos_mesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_mestreId_fkey" FOREIGN KEY ("mestreId") REFERENCES "mestres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_mestreId_fkey" FOREIGN KEY ("mestreId") REFERENCES "mestres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

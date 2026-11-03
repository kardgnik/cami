-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusAssinante" AS ENUM ('ATIVO', 'INADIMPLENTE', 'CANCELADO');

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
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinantes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "status" "StatusAssinante" NOT NULL DEFAULT 'ATIVO',
    "dataInicio" DATE NOT NULL,
    "observacoes" TEXT,
    "planoId" INTEGER NOT NULL,
    "plataformaId" INTEGER NOT NULL,
    "metodoPagamentoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinantes_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "assinantes_status_idx" ON "assinantes"("status");

-- CreateIndex
CREATE INDEX "assinantes_planoId_idx" ON "assinantes"("planoId");

-- CreateIndex
CREATE INDEX "assinantes_plataformaId_idx" ON "assinantes"("plataformaId");

-- CreateIndex
CREATE INDEX "assinantes_metodoPagamentoId_idx" ON "assinantes"("metodoPagamentoId");

-- AddForeignKey
ALTER TABLE "assinantes" ADD CONSTRAINT "assinantes_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinantes" ADD CONSTRAINT "assinantes_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "plataformas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinantes" ADD CONSTRAINT "assinantes_metodoPagamentoId_fkey" FOREIGN KEY ("metodoPagamentoId") REFERENCES "metodos_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

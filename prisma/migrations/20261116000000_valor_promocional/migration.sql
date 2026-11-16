-- Valor promocional por período na assinatura (ex.: 6 meses pela metade do preço).
-- Só acrescenta colunas opcionais: nenhum dado existente é alterado.
ALTER TABLE "assinaturas"
  ADD COLUMN "valorPromocionalCentavos" INTEGER,
  ADD COLUMN "promocaoAte" DATE;

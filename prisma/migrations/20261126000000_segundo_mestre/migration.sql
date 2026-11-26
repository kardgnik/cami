-- Segundo mestre na mesa (mestram juntos; cada um recebe o valor cheio da sessão).
-- Só acrescenta uma coluna opcional e amplia a chave única de sessões com o mestre:
-- nenhum dado existente é alterado e todas as linhas atuais continuam válidas.

ALTER TABLE "mesas" ADD COLUMN "mestre2Id" INTEGER;
CREATE INDEX "mesas_mestre2Id_idx" ON "mesas"("mestre2Id");
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_mestre2Id_fkey" FOREIGN KEY ("mestre2Id") REFERENCES "mestres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX "sessoes_mesaId_data_tipo_key";
CREATE UNIQUE INDEX "sessoes_mesaId_data_tipo_mestreId_key" ON "sessoes"("mesaId", "data", "tipo", "mestreId");

-- AlterTable
ALTER TABLE "pagamento" ADD COLUMN "lote_id" TEXT;

-- CreateIndex
CREATE INDEX "pagamento_lote_id_idx" ON "pagamento"("lote_id");

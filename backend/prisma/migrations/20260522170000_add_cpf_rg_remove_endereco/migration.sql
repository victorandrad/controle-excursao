-- AlterTable
ALTER TABLE "participante" ADD COLUMN "cpf" TEXT,
ADD COLUMN "rg" TEXT,
DROP COLUMN "endereco";

-- CreateIndex
CREATE UNIQUE INDEX "participante_cpf_key" ON "participante"("cpf");

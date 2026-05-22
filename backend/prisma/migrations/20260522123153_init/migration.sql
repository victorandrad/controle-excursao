-- CreateEnum
CREATE TYPE "ExcursaoStatus" AS ENUM ('aberta', 'encerrada');

-- CreateEnum
CREATE TYPE "ParcelaStatus" AS ENUM ('pendente', 'paga');

-- CreateEnum
CREATE TYPE "InscricaoStatus" AS ENUM ('ativa', 'cancelada');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('dinheiro', 'pix');

-- CreateEnum
CREATE TYPE "UsuarioRole" AS ENUM ('admin', 'tesoureiro');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('onibus', 'van');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "UsuarioRole" NOT NULL DEFAULT 'tesoureiro',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excursao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "data_ida" DATE NOT NULL,
    "data_volta" DATE,
    "valor" DECIMAL(10,2) NOT NULL,
    "num_parcelas" INTEGER NOT NULL,
    "tipo_veiculo" "TipoVeiculo" NOT NULL DEFAULT 'onibus',
    "total_assentos" INTEGER NOT NULL,
    "status" "ExcursaoStatus" NOT NULL DEFAULT 'aberta',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excursao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participante" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao" (
    "id" TEXT NOT NULL,
    "excursao_id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "numero_assento" INTEGER,
    "status" "InscricaoStatus" NOT NULL DEFAULT 'ativa',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcela" (
    "id" TEXT NOT NULL,
    "inscricao_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "ParcelaStatus" NOT NULL DEFAULT 'pendente',

    CONSTRAINT "parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id" TEXT NOT NULL,
    "parcela_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "valor_pago" DECIMAL(10,2) NOT NULL,
    "data_pagamento" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" "MetodoPagamento" NOT NULL,
    "referencia" TEXT,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "participante_cpf_key" ON "participante"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "inscricao_excursao_id_numero_assento_key" ON "inscricao"("excursao_id", "numero_assento");

-- CreateIndex
CREATE UNIQUE INDEX "parcela_inscricao_id_numero_key" ON "parcela"("inscricao_id", "numero");

-- AddForeignKey
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_excursao_id_fkey" FOREIGN KEY ("excursao_id") REFERENCES "excursao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela" ADD CONSTRAINT "parcela_inscricao_id_fkey" FOREIGN KEY ("inscricao_id") REFERENCES "inscricao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "parcela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

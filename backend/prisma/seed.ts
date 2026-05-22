import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('admin123', 10);

  await prisma.usuario.upsert({
    where: { email: 'admin@excursao.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@excursao.com',
      senhaHash,
      role: 'admin',
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'tesoureiro@excursao.com' },
    update: {},
    create: {
      nome: 'Tesoureiro',
      email: 'tesoureiro@excursao.com',
      senhaHash: await bcrypt.hash('tesoureiro123', 10),
      role: 'tesoureiro',
    },
  });

  const existente = await prisma.excursao.findFirst({
    where: { nome: 'Excursão Aparecida 2026' },
  });
  const excursao =
    existente ??
    (await prisma.excursao.create({
      data: {
        nome: 'Excursão Aparecida 2026',
        destino: 'Aparecida do Norte / SP',
        dataIda: new Date('2026-10-12'),
        dataVolta: new Date('2026-10-12'),
        valor: 240.0,
        numParcelas: 6,
        tipoVeiculo: 'onibus',
        totalAssentos: 46,
      },
    }));

  console.log('Seed concluído:');
  console.log('  Admin: admin@excursao.com / admin123');
  console.log('  Tesoureiro: tesoureiro@excursao.com / tesoureiro123');
  console.log('  Excursão:', excursao.nome);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

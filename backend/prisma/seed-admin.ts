import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@excursao.com';
  const senha = process.env.ADMIN_PASSWORD ?? 'admin123';
  const nome = process.env.ADMIN_NAME ?? 'Administrador';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`[seed-admin] admin já existe: ${existente.email} — nada a fazer`);
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senhaHash, role: 'admin' },
  });
  console.log(`[seed-admin] admin criado: ${usuario.email}`);
}

main()
  .catch((err) => {
    console.error('[seed-admin] erro:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

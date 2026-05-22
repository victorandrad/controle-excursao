import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExcursaoModule } from './excursao/excursao.module';
import { InscricaoModule } from './inscricao/inscricao.module';
import { PagamentoModule } from './pagamento/pagamento.module';
import { ParticipanteModule } from './participante/participante.module';
import { RelatorioModule } from './relatorio/relatorio.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ExcursaoModule,
    InscricaoModule,
    PagamentoModule,
    ParticipanteModule,
    RelatorioModule,
  ],
})
export class AppModule {}

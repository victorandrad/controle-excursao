import { Module } from '@nestjs/common';
import { ExcursaoController } from './excursao.controller';
import { ExcursaoService } from './excursao.service';

@Module({
  controllers: [ExcursaoController],
  providers: [ExcursaoService],
  exports: [ExcursaoService],
})
export class ExcursaoModule {}

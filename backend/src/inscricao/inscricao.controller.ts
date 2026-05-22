import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../shared/zod-validation.pipe';
import { InscricaoService } from './inscricao.service';
import { AtribuirAssentoSchema, InscreverSchema } from './inscricao.dto';
import type { AtribuirAssentoDto, InscreverDto } from './inscricao.dto';

@Controller('inscricoes')
@UseGuards(JwtAuthGuard)
export class InscricaoController {
  constructor(private service: InscricaoService) {}

  @Get()
  listarPorExcursao(@Query('excursaoId') excursaoId: string) {
    return this.service.listarPorExcursao(excursaoId);
  }

  @Get('assentos-livres')
  assentosLivres(@Query('excursaoId') excursaoId: string) {
    return this.service.assentosLivres(excursaoId);
  }

  @Get('participante')
  listarPorParticipante(
    @Query('excursaoId') excursaoId: string,
    @Query('participanteId') participanteId: string,
  ) {
    return this.service.listarPorParticipante(excursaoId, participanteId);
  }

  @Post('inscrever')
  inscrever(@Body(new ZodValidationPipe(InscreverSchema)) dto: InscreverDto) {
    return this.service.inscrever(dto);
  }

  @Patch(':id/assento')
  atribuirAssento(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AtribuirAssentoSchema)) dto: AtribuirAssentoDto,
  ) {
    return this.service.atribuirAssento(id, dto.numeroAssento);
  }
}

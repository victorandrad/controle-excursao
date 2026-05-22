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
import { ParticipanteService } from './participante.service';
import {
  AtualizarParticipanteSchema,
  CriarParticipanteSchema,
} from './participante.dto';
import type {
  AtualizarParticipanteDto,
  CriarParticipanteDto,
} from './participante.dto';

@Controller('participantes')
@UseGuards(JwtAuthGuard)
export class ParticipanteController {
  constructor(private service: ParticipanteService) {}

  @Get()
  listar(
    @Query('busca') busca?: string,
    @Query('campanhaId') campanhaId?: string,
    @Query('somenteQuitados') somenteQuitados?: string,
  ) {
    return this.service.listar(busca, campanhaId, somenteQuitados === 'true');
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.service.buscar(id);
  }

  @Post()
  criar(
    @Body(new ZodValidationPipe(CriarParticipanteSchema))
    dto: CriarParticipanteDto,
  ) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AtualizarParticipanteSchema))
    dto: AtualizarParticipanteDto,
  ) {
    return this.service.atualizar(id, dto);
  }
}

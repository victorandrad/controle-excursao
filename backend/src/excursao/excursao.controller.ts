import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../shared/zod-validation.pipe';
import { ExcursaoService } from './excursao.service';
import { AtualizarExcursaoSchema, CriarExcursaoSchema } from './excursao.dto';
import type { AtualizarExcursaoDto, CriarExcursaoDto } from './excursao.dto';

@Controller('excursoes')
@UseGuards(JwtAuthGuard)
export class ExcursaoController {
  constructor(private service: ExcursaoService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.service.buscar(id);
  }

  @Post()
  criar(
    @Body(new ZodValidationPipe(CriarExcursaoSchema)) dto: CriarExcursaoDto,
  ) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AtualizarExcursaoSchema))
    dto: AtualizarExcursaoDto,
  ) {
    return this.service.atualizar(id, dto);
  }

  @Patch(':id/encerrar')
  encerrar(@Param('id') id: string) {
    return this.service.encerrar(id);
  }

  @Delete(':id')
  excluir(@Param('id') id: string) {
    return this.service.excluir(id);
  }
}

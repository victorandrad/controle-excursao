import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../shared/zod-validation.pipe';
import type { AuthenticatedRequest } from '../shared/authenticated-request';
import { PagamentoService } from './pagamento.service';
import { RegistrarPagamentoSchema } from './pagamento.dto';
import type { RegistrarPagamentoDto } from './pagamento.dto';

@Controller('pagamentos')
@UseGuards(JwtAuthGuard)
export class PagamentoController {
  constructor(private service: PagamentoService) {}

  @Get()
  listarPorInscricao(@Query('inscricaoId') inscricaoId: string) {
    return this.service.listarPorInscricao(inscricaoId);
  }

  @Post()
  registrar(
    @Body(new ZodValidationPipe(RegistrarPagamentoSchema))
    dto: RegistrarPagamentoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.registrar(dto, req.user.id);
  }
}

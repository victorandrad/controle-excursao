import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../shared/zod-validation.pipe';
import type { AuthenticatedRequest } from '../shared/authenticated-request';
import { PagamentoService } from './pagamento.service';
import { RegistrarPagamentoSchema } from './pagamento.dto';
import type { RegistrarPagamentoDto } from './pagamento.dto';
import { comprovanteMulterOptions } from './comprovante.config';

@Controller('pagamentos')
@UseGuards(JwtAuthGuard)
export class PagamentoController {
  constructor(private service: PagamentoService) {}

  @Get()
  listarPorInscricao(@Query('inscricaoId') inscricaoId: string) {
    return this.service.listarPorInscricao(inscricaoId);
  }

  @Get(':id/comprovante')
  baixarComprovante(@Param('id') id: string) {
    return this.service.obterComprovante(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('comprovante', comprovanteMulterOptions))
  registrar(
    @Body(new ZodValidationPipe(RegistrarPagamentoSchema))
    dto: RegistrarPagamentoDto,
    @UploadedFile() comprovante: Express.Multer.File | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.registrar(dto, req.user.id, comprovante);
  }
}

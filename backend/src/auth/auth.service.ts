import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

type ExpiresIn = SignOptions['expiresIn'];

@Injectable()
export class AuthService {
  private readonly accessSecret = process.env.JWT_SECRET ?? 'change-me';
  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh';
  private readonly accessExpiry = (process.env.JWT_EXPIRES_IN ??
    '15m') as ExpiresIn;
  private readonly refreshExpiry = (process.env.JWT_REFRESH_EXPIRES_IN ??
    '30d') as ExpiresIn;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario) throw new UnauthorizedException('Credenciais inválidas');

    const valido = await bcrypt.compare(senha, usuario.senhaHash);
    if (!valido) throw new UnauthorizedException('Credenciais inválidas');

    const { senhaHash: _, ...resultado } = usuario;
    return resultado;
  }

  login(usuario: { id: string; email: string; role: string; nome: string }) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiry,
      }),
      refresh_token: this.jwtService.sign(
        { sub: usuario.id },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiry },
      ),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.refreshSecret,
      });
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
      });
      if (!usuario) throw new Error();
      const newPayload = {
        sub: usuario.id,
        email: usuario.email,
        role: usuario.role,
      };
      return {
        access_token: this.jwtService.sign(newPayload, {
          secret: this.accessSecret,
          expiresIn: this.accessExpiry,
        }),
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }
}

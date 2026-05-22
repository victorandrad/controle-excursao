import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/** Pasta onde os comprovantes ficam (montada em volume persistente no Docker). */
export const COMPROVANTES_DIR = join(process.cwd(), 'uploads', 'comprovantes');

const TIPOS_ACEITOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export const MAX_COMPROVANTE_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_POR_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

/** Deriva o Content-Type a partir da extensão do arquivo salvo. */
export function mimeDoArquivo(filename: string): string {
  return (
    MIME_POR_EXT[extname(filename).toLowerCase()] ?? 'application/octet-stream'
  );
}

export const comprovanteMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      if (!existsSync(COMPROVANTES_DIR)) {
        mkdirSync(COMPROVANTES_DIR, { recursive: true });
      }
      cb(null, COMPROVANTES_DIR);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_COMPROVANTE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_ACEITOS.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Comprovante deve ser imagem (JPG, PNG, WEBP, GIF) ou PDF',
        ),
        false,
      );
    }
  },
};

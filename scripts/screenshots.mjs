// Captura automática dos screenshots do portfólio (p1, p2) via Playwright.
//
// Uso:
//   cd scripts
//   npm install
//   npx playwright install chromium
//   node screenshots.mjs
//
// Variáveis de ambiente (todas opcionais):
//   BASE_URL        URL da app          (default http://localhost:4200)
//   ADMIN_EMAIL     login               (default admin@igreja.com)
//   ADMIN_PASSWORD  senha               (default admin123)
//   OUT_DIR         pasta de saída      (default ./output/controle-carnes)
//
// Pré-requisitos para screenshots ricos: rodar `npm run db:seed:demo` no backend
// (popula 15 participantes + 20 carnês com pagamentos variados).

import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4200';
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@igreja.com';
const SENHA = process.env.ADMIN_PASSWORD ?? 'admin123';
const OUT = process.env.OUT_DIR ?? path.resolve('output/controle-carnes');
const VIEWPORT = { width: 1440, height: 900 };

// Recomprime o PNG in-place (alvo ~≤200KB). Lê pra buffer antes de escrever
// pra não dar conflito de leitura/escrita no mesmo arquivo.
async function compress(file) {
  const buf = await sharp(file)
    .png({ compressionLevel: 9, palette: true, quality: 80 })
    .toBuffer();
  await writeFile(file, buf);
  const kb = (buf.length / 1024).toFixed(0);
  console.log(`  ${path.basename(file)} — ${kb} KB`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  // 1) Login
  console.log('Login...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="senha"]', SENHA);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/selecionar-campanha', { timeout: 15000 });

  // 2) Seleciona a primeira campanha (linha da tabela desktop)
  console.log('Selecionando campanha...');
  await page.locator('.campanha-row').first().click();
  await page.waitForURL((u) => !u.pathname.includes('selecionar-campanha'), {
    timeout: 15000,
  });

  // 3) p1 — venda de carnês (seleciona um participante pra renderizar a cartela)
  console.log('p1 — venda de carnês...');
  await page.goto(`${BASE}/carnes`, { waitUntil: 'networkidle' });
  await page.locator('.participante-row').first().click();
  await page.locator('.num-btn').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(600); // deixa a animação assentar
  const p1 = path.join(OUT, 'p1.png');
  await page.screenshot({ path: p1 });
  await compress(p1);

  // 4) p2 — relatórios
  console.log('p2 — relatórios...');
  await page.goto(`${BASE}/relatorios`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const p2 = path.join(OUT, 'p2.png');
  await page.screenshot({ path: p2 });
  await compress(p2);

  await browser.close();
  console.log(`\nPronto. Screenshots em: ${OUT}`);
}

main().catch((err) => {
  console.error('Falha ao gerar screenshots:', err);
  process.exit(1);
});

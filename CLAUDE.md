# CLAUDE.md

> Documento de contexto para agentes de IA (Claude Code, Cursor, Copilot, etc.)
> trabalhando neste repositório. Leia este arquivo **antes** de propor qualquer
> mudança de schema, regra de negócio ou padrão arquitetural.

---

## 1. Visão Geral do Projeto

**Sistema de Gestão de Pagamentos de Excursões** — aplicação web para
organizadores gerenciarem excursões (romarias, viagens, passeios) em que
participantes se inscrevem e pagam o valor da viagem de forma parcelada.
Permite controlar inscrições, parcelas, pagamentos e a **distribuição de
assentos** do veículo (ônibus ou van).

Substitui o controle feito em planilhas e papéis. Pagamentos chegam
predominantemente em dinheiro ou Pix.

> Este projeto é um **clone adaptado** do sistema "controle-carnes" (carnês de
> sorteio). O conceito de sorteio/número da sorte foi removido; no lugar entram
> **inscrições** com **assento opcional** e **mapa de assentos por veículo**.

**Usuários do sistema:**
- **Tesoureiro / Secretário** — registra pagamentos, cadastra participantes,
  cria inscrições e atribui assentos.
- **Administrador** — configura excursões, vê relatórios consolidados.

**Não-objetivos (fora do escopo):**
- Integração contábil com sistemas externos
- Multi-tenant — single-tenant, um único organizador
- Aplicativo nativo mobile (a webapp deve ser responsiva)
- Notificações automáticas (WhatsApp/email/SMS)
- Importação de planilha (removida deste clone)

---

## 2. Stack Técnica

| Camada              | Tecnologia                                        |
| ------------------- | ------------------------------------------------- |
| Frontend            | Angular 18 (standalone components, signals)       |
| Backend             | NestJS (REST API)                                 |
| Linguagem           | TypeScript em `strict` mode (mono-repo)           |
| Banco               | PostgreSQL                                         |
| ORM                 | Prisma (no backend NestJS)                        |
| UI                  | ng-zorro-antd — sem Tailwind                       |
| Auth                | Passport.js + JWT (NestJS Guards + Angular Guards)|
| Validação           | Zod nos boundaries dos endpoints NestJS           |
| Testes              | Jest (unit/integration)                           |
| Dev local           | Docker Desktop (PostgreSQL + backend)             |

Angular SPA + NestJS API separados. Comunicação via REST. Prisma e toda a
lógica de domínio ficam exclusivamente no backend.

---

## 3. Domínio

### 3.1 Glossário

| Termo            | Definição                                                                              |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Excursão**     | Viagem com destino e data (ex: "Excursão Aparecida 2026"). Tem valor, parcelas, tipo de veículo e total de assentos. |
| **Inscrição**    | Uma "vaga" numa excursão, vinculada a um participante. Tem `numeroAssento` **opcional**. |
| **Parcela**      | Fração do valor da inscrição. Quantidade fixa por excursão (`numParcelas`).            |
| **Pagamento**    | Registro de quitação de uma parcela, em dinheiro ou Pix.                               |
| **Participante** | Pessoa que se inscreveu em uma ou mais excursões.                                      |
| **Quitado**      | Inscrição com **todas** as parcelas pagas.                                             |
| **Assento**      | Posição no veículo (1..`totalAssentos`). Opcional — pode ser atribuído depois.        |
| **Tipo de veículo** | `onibus` ou `van` — define o layout do mapa de assentos.                            |

### 3.2 Modelo de Dados (entidades)

```
EXCURSAO       (1) ── (N) INSCRICAO
PARTICIPANTE   (1) ── (N) INSCRICAO
INSCRICAO      (1) ── (N) PARCELA
PARCELA        (1) ── (N) PAGAMENTO
USUARIO        (1) ── (N) PAGAMENTO   (quem registrou)
```

- **Excursao**: `id`, `nome`, `destino`, `dataIda` (Date), `dataVolta` (Date?),
  `valor` (Decimal), `numParcelas` (Int), `tipoVeiculo` (`onibus`|`van`),
  `totalAssentos` (Int), `status` (`aberta`|`encerrada`).
- **Participante**: `id`, `nome`, `cpf?`, `rg?`, `telefone?`.
- **Inscricao**: `id`, `excursaoId`, `participanteId`, `numeroAssento` (Int?,
  nullable), `status` (`ativa`|`cancelada`), `criadoEm`.
- **Parcela**: `id`, `inscricaoId`, `numero` (1..N), `status` (`pendente`|`paga`).
- **Pagamento**: `id`, `parcelaId`, `usuarioId`, `valorPago`, `dataPagamento`
  (Date, editável), `criadoEm` (audit), `metodo` (`dinheiro`|`pix`), `referencia?`.
- **Usuario**: `id`, `nome`, `email`, `senhaHash`, `role`.

A versão canônica é `backend/prisma/schema.prisma`.

### 3.3 Regras de Negócio

1. **Quitação é binária e por inscrição.** Uma inscrição está quitada se, e
   somente se, todas as suas parcelas têm `status = 'paga'`.
2. **`numeroAssento` é opcional e único por excursão.** Várias inscrições podem
   ficar sem assento (`null`); quando atribuído, é único por excursão
   (`@@unique([excursaoId, numeroAssento])`; NULLs são distintos no Postgres).
3. **`valor` e `numParcelas` são imutáveis após criar a excursão.** A UI bloqueia,
   o backend valida (PATCH não aceita esses campos).
4. **Inscrições e parcelas NÃO são pré-criadas.** Geração lazy: ao inscrever,
   uma transação cria 1 Inscrição + N Parcelas atomicamente.
5. **Inscrição em lote.** Pode-se criar várias inscrições numa operação
   (`quantidade`). Tudo numa transação — ou cria todas, ou nenhuma.
6. **`totalAssentos` é o teto de inscrições.** Não dá pra inscrever além disso,
   nem reduzir abaixo do nº de inscrições existentes.
7. **`tipoVeiculo` define o layout do mapa de assentos** (frontend): ônibus =
   2 + corredor + 2 por fileira; van = 1 + corredor + 2.
8. **Parcelas não têm vencimento individual** — só `pendente` ou `paga`.
9. **Valores em `Decimal`** sempre (`@db.Decimal(10,2)`). Nunca `float`/`number`.
10. **`data_pagamento` ≠ `criado_em`.** A primeira é editável (data real do
    recebimento); a segunda é audit (timestamp do banco no INSERT).
11. **Métodos de pagamento:** `dinheiro` e `pix` apenas.
12. **Propriedades calculadas nunca são armazenadas** (`quitado`,
    `valorParcela`, agregados) — sempre derivadas.

---

## 4. Estrutura do Repositório

```
.
├── backend/                          # NestJS API
│   ├── src/
│   │   ├── excursao/                 # module, controller, service, dto
│   │   ├── inscricao/                # inscrever + atribuir assento + assentos-livres
│   │   ├── pagamento/
│   │   ├── participante/
│   │   ├── relatorio/
│   │   ├── auth/
│   │   ├── domain/                   # quitacao.ts, valor-parcela.ts
│   │   ├── prisma/
│   │   └── main.ts
│   └── prisma/{schema.prisma, migrations/, seed.ts, seed-admin.ts}
├── frontend/                         # Angular 18 SPA
│   └── src/app/{excursoes, inscricoes, pagamentos, participantes, relatorios, auth, layout, shared}
├── docker-compose.yml                # dev: postgres (5433) + backend (3001)
└── CLAUDE.md
```

> **Portas dev** ajustadas pra coexistir com o controle-carnes: postgres
> `5433:5432`, backend `3001:3000`, frontend (ng serve local) `4201`.

---

## 5. Endpoints principais

- `GET/POST/PATCH/DELETE /api/excursoes` (+ `PATCH /:id/encerrar`)
- `GET /api/inscricoes?excursaoId=` · `GET /api/inscricoes/assentos-livres?excursaoId=`
  · `GET /api/inscricoes/participante?excursaoId=&participanteId=`
- `POST /api/inscricoes/inscrever` `{ excursaoId, participanteId, quantidade }`
- `PATCH /api/inscricoes/:id/assento` `{ numeroAssento: number|null }`
- `GET/POST /api/pagamentos` (GET por `?inscricaoId=`)
- `GET/POST/PATCH /api/participantes`
- `GET /api/relatorios/excursao/:id`

---

## 6. Comandos

```bash
# Dev (Docker: postgres + backend)
docker compose up -d --build        # postgres:5433, backend:3001

# Backend
cd backend
npm install
npm run db:migrate:dev              # prisma migrate dev
npm run db:seed                     # admin + tesoureiro + excursão exemplo
npm run db:seed:admin              # só admin (roda no boot via start:prod)
npm test ; npm run lint ; npm run typecheck

# Frontend (rodar local, sem Docker)
cd frontend
npm install
npm start -- --port 4201           # aponta pro backend em localhost:3001/api
npm run lint ; npm run build
```

Credenciais do seed: `admin@excursao.com` / `admin123`.

---

## 7. O Que NÃO Fazer

- **Não** armazenar `quitado`, `valorParcela` ou agregados calculáveis.
- **Não** criar inscrições/parcelas em massa fora de transação.
- **Não** permitir edição de `valor`/`numParcelas` após criar a excursão.
- **Não** usar `float`/`number` para dinheiro — sempre `Decimal`.
- **Não** acessar Prisma/banco direto do Angular.
- **Não** reintroduzir o conceito de sorteio/número da sorte.

---

*Clone de controle-carnes adaptado para excursões. Última revisão: 2026-05-22.*

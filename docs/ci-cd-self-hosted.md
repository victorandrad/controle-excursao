# Arquitetura de CI/CD — GitHub Actions self-hosted no VPS

Guia reutilizável do padrão de deploy usado neste projeto. Serve de template
para qualquer outro repositório que vá rodar no mesmo VPS.

> **Convenção em todo o doc:** troque `<PROJETO>` pelo identificador do projeto
> (kebab-case, ex: `controle-excursao`), `<ORG>` pelo dono do repo (ex:
> `victorandrad`) e `<DOMINIO>` pelo host público (ex: `gestaoexcursao.victorandra.de`).

---

## 1. Princípio

Um VPS hospeda **vários projetos**, cada um isolado por:

| Eixo de isolamento        | Mecanismo                                            |
| ------------------------- | --------------------------------------------------- |
| Runner                    | 1 runner self-hosted por repo, com **label própria**|
| Pasta no disco            | `/opt/ci/<PROJETO>/{app,runner}`                    |
| Stack Docker              | `name: <PROJETO>` no `docker-compose.prod.yml`     |
| Roteamento do job         | `runs-on: [self-hosted, <PROJETO>]`                 |

O GitHub direciona cada job ao runner certo pela **label**. O Docker Compose
separa volumes/redes/containers pelo **project name**. Resultado: projetos
coexistem no mesmo VPS sem colisão.

```
/opt/ci/
├── projeto-a/
│   ├── app/      ← repo clonado (git pull + docker compose aqui)
│   └── runner/   ← agente do GitHub Actions
├── projeto-b/
│   ├── app/
│   └── runner/
└── ...
```

---

## 2. Topologia dos workflows

Dois workflows encadeados, cada um com sua **DAG paralela** própria:

```
push em main
   │
   ▼
[Backend workflow]  (.github/workflows/backend.yml)
   changes → install → ┬ lint  ┐
                       └ test  ┴→ build → deploy
   │
   │ workflow_run: completed (success | skipped)
   ▼
[Frontend workflow] (.github/workflows/frontend.yml)
   changes → install → ┬ lint  ┐
                       └ test  ┴→ build → deploy
```

Por que **dois arquivos** e não um só:

- Cada workflow vira uma página separada na aba Actions, com DAG limpa onde
  `lint` e `test` aparecem **lado a lado** (paralelos).
- O frontend só dispara **após** o backend completar, via `workflow_run` — sem
  empilhar tudo numa DAG linear gigante.
- Se o backend falhar, o frontend nem começa.

### Fases de cada pipeline

| Fase      | Onde roda          | O que faz                                          |
| --------- | ------------------ | -------------------------------------------------- |
| `changes` | runner (workspace) | path filter — decide se o pipeline roda            |
| `install` | runner (workspace) | `npm ci` com cache local por hash do lock          |
| `lint`    | runner (workspace) | `npm run lint`                                      |
| `test`    | runner (workspace) | `npm run typecheck` + `npm test` (ou `test:ci`)    |
| `build`   | VPS (`app/`)       | `git pull` + `.env` + `docker compose build <svc>` |
| `deploy`  | VPS (`app/`)       | `docker compose up -d <svc>`                        |

`install/lint/test` rodam no **workspace do runner** (`~/actions-runner/_work/...`).
`build/deploy` rodam na **pasta da stack** (`/opt/ci/<PROJETO>/app`).

---

## 3. Setup do VPS (uma vez por projeto)

### 3.1 Estrutura de pastas

```bash
sudo mkdir -p /opt/ci/<PROJETO>/{app,runner}
sudo chown -R runner:runner /opt/ci/<PROJETO>   # 'runner' = usuário do serviço
```

### 3.2 Registrar o runner

No GitHub: **Settings → Actions → Runners → New self-hosted runner** (Linux x64).
Copie o token de registro (vale ~1h) e no VPS:

```bash
cd /opt/ci/<PROJETO>/runner
curl -o actions-runner.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.334.0/actions-runner-linux-x64-2.334.0.tar.gz
tar xzf actions-runner.tar.gz

./config.sh \
  --unattended \
  --url https://github.com/<ORG>/<PROJETO> \
  --token <TOKEN_DE_REGISTRO> \
  --name <PROJETO>-runner \
  --labels <PROJETO>

sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status   # deve dizer "active (running)"
```

> O token só serve para o `config.sh`. Depois vira credencial permanente em
> `.runner`/`.credentials` — o runner reconecta sozinho mesmo após reboot.

### 3.3 Permissão de Docker

```bash
sudo usermod -aG docker runner
sudo systemctl restart "actions.runner.<ORG>-<PROJETO>.<PROJETO>-runner.service"
```

### 3.4 Chromium (só se o frontend tiver testes headless)

```bash
sudo apt-get update && sudo apt-get install -y chromium
# se virar snap-only e falhar no headless, use Google Chrome via .deb:
wget -qO - https://dl-ssl.google.com/linux/linux_signing_key.pub \
  | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
  | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update && sudo apt-get install -y google-chrome-stable
```

### 3.5 Secrets no GitHub

**Settings → Secrets and variables → Actions** — cadastre o que o `.env` de
produção precisa (ex.: `JWT_SECRET`, `POSTGRES_PASSWORD`). Com runner
self-hosted **não há SSH**, então não precisa de chave/host/porta.

---

## 4. `docker-compose.prod.yml`

Fixe o **project name** no topo — garante volumes/containers estáveis
independente da pasta de onde o compose é executado:

```yaml
name: <PROJETO>

services:
  postgres: ...
  backend: ...
  frontend: ...
```

Sem isso, o Compose usa o nome da pasta (`app`) como project name e o volume do
banco fica órfão se a pasta mudar.

---

## 5. Workflows (templates)

### 5.1 `.github/workflows/backend.yml`

```yaml
name: Backend

on:
  push:
    branches: [main]

jobs:
  changes:
    name: Detect changes
    runs-on: [self-hosted, <PROJETO>]
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
              - 'docker-compose.prod.yml'

  install:
    name: Backend · install
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: [self-hosted, <PROJETO>]
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
        with:
          clean: false
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: install (pula npm ci se o lock não mudou)
        run: |
          LOCK_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
          if [ -f node_modules/.lock-hash ] && [ "$(cat node_modules/.lock-hash)" = "$LOCK_HASH" ]; then
            echo "node_modules em dia — pulando npm ci"
          else
            npm ci --no-audit --no-fund
            echo "$LOCK_HASH" > node_modules/.lock-hash
          fi

  lint:
    name: Backend · lint
    needs: install
    runs-on: [self-hosted, <PROJETO>]
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
        with:
          clean: false
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm run lint

  test:
    name: Backend · test
    needs: install
    runs-on: [self-hosted, <PROJETO>]
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
        with:
          clean: false
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm run typecheck
      - run: npm test

  build:
    name: Backend · build
    needs: [lint, test]
    runs-on: [self-hosted, <PROJETO>]
    concurrency:
      group: vps-rollout
      cancel-in-progress: false
    defaults:
      run:
        working-directory: /opt/ci/<PROJETO>/app
    steps:
      - name: bootstrap app dir
        working-directory: /tmp
        run: |
          if [ ! -d /opt/ci/<PROJETO>/app/.git ]; then
            mkdir -p /opt/ci/<PROJETO>
            git clone https://github.com/${{ github.repository }}.git /opt/ci/<PROJETO>/app
          fi
      - name: build
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
        run: |
          git pull origin main
          cat > .env <<EOF
          JWT_SECRET=$JWT_SECRET
          POSTGRES_PASSWORD=$POSTGRES_PASSWORD
          EOF
          docker compose -f docker-compose.prod.yml build backend

  deploy:
    name: Backend · deploy
    needs: build
    runs-on: [self-hosted, <PROJETO>]
    concurrency:
      group: vps-rollout
      cancel-in-progress: false
    defaults:
      run:
        working-directory: /opt/ci/<PROJETO>/app
    steps:
      - run: |
          docker compose -f docker-compose.prod.yml up -d backend --remove-orphans
          docker image prune -f || true
```

### 5.2 `.github/workflows/frontend.yml`

Dispara via `workflow_run` quando o **Backend** termina. Como `workflow_run`
não traz o path filter do push, a detecção de mudança usa `git diff` no
commit que disparou (`head_sha`).

```yaml
name: Frontend

on:
  workflow_run:
    workflows: [Backend]
    types: [completed]
    branches: [main]

jobs:
  changes:
    name: Detect changes
    if: >-
      github.event.workflow_run.conclusion != 'failure' &&
      github.event.workflow_run.conclusion != 'cancelled'
    runs-on: [self-hosted, <PROJETO>]
    outputs:
      frontend: ${{ steps.check.outputs.frontend }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
          fetch-depth: 2
      - id: check
        run: |
          if git diff --name-only HEAD~1 HEAD | grep -qE '^(frontend/|docker-compose\.prod\.yml)'; then
            echo "frontend=true" >> "$GITHUB_OUTPUT"
          else
            echo "frontend=false" >> "$GITHUB_OUTPUT"
          fi

  install:
    name: Frontend · install
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: [self-hosted, <PROJETO>]
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
          clean: false
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: install (pula npm ci se o lock não mudou)
        run: |
          LOCK_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
          if [ -f node_modules/.lock-hash ] && [ "$(cat node_modules/.lock-hash)" = "$LOCK_HASH" ]; then
            echo "node_modules em dia — pulando npm ci"
          else
            npm ci --no-audit --no-fund
            echo "$LOCK_HASH" > node_modules/.lock-hash
          fi

  lint:
    name: Frontend · lint
    needs: install
    runs-on: [self-hosted, <PROJETO>]
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
          clean: false
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm run lint

  test:
    name: Frontend · test
    needs: install
    runs-on: [self-hosted, <PROJETO>]
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
          clean: false
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: locate chrome
        working-directory: /tmp
        run: |
          export PATH="$PATH:/usr/local/bin:/usr/bin:/snap/bin"
          for path in \
            /usr/bin/chromium /usr/bin/chromium-browser \
            /usr/bin/google-chrome-stable /usr/bin/google-chrome \
            /snap/bin/chromium; do
            if [ -x "$path" ]; then
              echo "CHROME_BIN=$path" >> "$GITHUB_ENV"; exit 0
            fi
          done
          echo "::error::Chrome não encontrado no VPS"; exit 1
      - run: npm run test:ci

  build:
    name: Frontend · build
    needs: [lint, test]
    runs-on: [self-hosted, <PROJETO>]
    concurrency:
      group: vps-rollout
      cancel-in-progress: false
    defaults:
      run:
        working-directory: /opt/ci/<PROJETO>/app
    steps:
      - name: bootstrap app dir
        working-directory: /tmp
        run: |
          if [ ! -d /opt/ci/<PROJETO>/app/.git ]; then
            mkdir -p /opt/ci/<PROJETO>
            git clone https://github.com/${{ github.repository }}.git /opt/ci/<PROJETO>/app
          fi
      - name: build
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
        run: |
          git pull origin main
          cat > .env <<EOF
          JWT_SECRET=$JWT_SECRET
          POSTGRES_PASSWORD=$POSTGRES_PASSWORD
          EOF
          docker compose -f docker-compose.prod.yml build frontend

  deploy:
    name: Frontend · deploy
    needs: build
    runs-on: [self-hosted, <PROJETO>]
    concurrency:
      group: vps-rollout
      cancel-in-progress: false
    defaults:
      run:
        working-directory: /opt/ci/<PROJETO>/app
    steps:
      - run: |
          docker compose -f docker-compose.prod.yml up -d frontend --remove-orphans
          docker image prune -f || true
```

---

## 6. Técnicas-chave (e o porquê)

### Cache de `node_modules` por hash do lock
Em vez de `actions/cache` (que faz upload/download de centenas de MB pro
storage do GitHub — lento em self-hosted), aproveitamos que **o disco do runner
persiste entre runs**. O `install` grava o SHA-256 do `package-lock.json` em
`node_modules/.lock-hash`; nos próximos runs, se o hash bate, pula o `npm ci`.

### `clean: false` no checkout
O `actions/checkout` por padrão roda `git clean -ffdx`, que apagaria o
`node_modules` (untracked). Com `clean: false`, ele sobrevive entre os jobs
`install → lint → test` (que rodam no mesmo workspace do runner único).

### Separação workspace vs. pasta da stack
CI (install/lint/test) usa o workspace efêmero do runner. Deploy (build/deploy)
usa `/opt/ci/<PROJETO>/app` com `git pull` + `docker compose`. São pastas
diferentes de propósito — o CI valida, o deploy entrega.

### `concurrency: group: vps-rollout`
Compartilhado entre os jobs `build`/`deploy` dos **dois** workflows. Garante que
nunca rode mais de um `docker compose` no VPS ao mesmo tempo (evita corrida em
`.env`, `git pull` e estado do Docker). Com 1 runner já serializa, mas a config
protege se você adicionar runners.

### `bootstrap app dir`
Primeiro deploy numa máquina limpa não tem `/opt/ci/<PROJETO>/app`. O step cria
e clona se faltar; nas próximas vezes é no-op. Roda com `working-directory: /tmp`
porque o default (`app/`) ainda não existe.

### Encadeamento por `workflow_run`
O frontend escuta o evento `completed` do workflow "Backend". O gate
`conclusion != 'failure' && != 'cancelled'` faz o frontend rodar quando o
backend deu **success** ou **skipped** (não mudou), e pular quando falhou.

---

## 7. Checklist — adaptar para um projeto novo

```
VPS (uma vez):
- [ ] sudo mkdir -p /opt/ci/<PROJETO>/{app,runner} && chown runner:runner
- [ ] Registrar runner com --labels <PROJETO> e instalar como serviço
- [ ] sudo usermod -aG docker runner (+ restart do serviço)
- [ ] Instalar chromium/google-chrome (se houver test:ci de frontend)

Repo:
- [ ] name: <PROJETO> no docker-compose.prod.yml
- [ ] Cadastrar secrets (JWT_SECRET, POSTGRES_PASSWORD, ...) em Actions
- [ ] Copiar .github/workflows/backend.yml e frontend.yml, trocar <PROJETO>
- [ ] Garantir scripts npm: lint, typecheck, test (back) e lint, test:ci (front)
- [ ] Dockerfile de prod copia tsconfig*.json se usar ts-node em runtime
- [ ] schema.prisma com binaryTargets ["native","debian-openssl-3.0.x"] (se Prisma)

Validação:
- [ ] Push em main → workflow "Backend" roda e fica verde
- [ ] "Frontend" dispara depois e fica verde
- [ ] App no ar em https://<DOMINIO>
```

---

## 8. Troubleshooting

| Sintoma                                             | Causa provável / fix                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Job preso em "Waiting for a runner"                 | Label não bate. Confira `--labels <PROJETO>` no runner ou edite labels na UI.    |
| `No such file or directory` em `/opt/ci/.../app`    | Pasta não existe/permissão. Rode o setup 3.1 ou confie no `bootstrap app dir`.   |
| `No binary for ChromeHeadless`                      | Chromium ausente no VPS. Veja 3.4. O step `locate chrome` exporta `CHROME_BIN`. |
| Prisma: engine `debian-openssl-3.0.x` not found     | Faltou `binaryTargets`. Veja checklist. `docker compose build --no-cache` força.|
| `ts-node`: Unknown file extension ".ts" em prod     | `tsconfig.json` não copiado pro runtime stage do Dockerfile.                     |
| Frontend não dispara após backend                   | `workflow_run` só funciona com o arquivo já em `main`; só vale do 2º push em diante. |
| `npm ci` falha por lock dessincronizado             | `package-lock.json` desatualizado — rode `npm install` e commite o lock.         |

---

*Padrão validado no projeto controle-excursao (Angular 18 + NestJS + PostgreSQL,
runner self-hosted na Hostinger).*

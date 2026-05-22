#!/usr/bin/env bash
#
# Provisiona N runners self-hosted do GitHub Actions no VPS, como serviços
# systemd, todos com a mesma label. Usa um PAT pra gerar os tokens de registro
# automaticamente (não precisa copiar token da UI a cada runner).
#
# Uso:
#   sudo GITHUB_PAT=ghp_xxx ./setup-runners.sh [N]
#
#   N = quantidade de runners a garantir (default 2). Idempotente: pula os que
#       já estão configurados.
#
# Variáveis de ambiente:
#   GITHUB_PAT      (obrigatório)  PAT com permissão Administration:write no repo
#   REPO            (default victorandrad/controle-carnes)
#   LABEL           (default controle-carnes)
#   RUNNER_USER     (default runner)   usuário que roda os serviços
#   RUNNER_VERSION  (default 2.334.0)
#   BASE_DIR        (default /opt/ci/controle-carnes)
#
# Remover um runner depois:
#   cd /opt/ci/controle-carnes/runner-N
#   sudo ./svc.sh stop && sudo ./svc.sh uninstall
#   ./config.sh remove --token <token-de-remoção-do-PAT>   # ou apague pela UI

set -euo pipefail

COUNT="${1:-2}"
REPO="${REPO:-victorandrad/controle-carnes}"
LABEL="${LABEL:-controle-carnes}"
RUNNER_USER="${RUNNER_USER:-runner}"
RUNNER_VERSION="${RUNNER_VERSION:-2.334.0}"
BASE_DIR="${BASE_DIR:-/opt/ci/controle-carnes}"
PAT="${GITHUB_PAT:?defina GITHUB_PAT com um token de admin do repo}"

TARBALL="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
DOWNLOAD_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${TARBALL}"
CACHE_TARBALL="${BASE_DIR}/${TARBALL}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode como root (sudo)." >&2
  exit 1
fi

# Gera um token de registro novo via API (válido ~1h).
api_registration_token() {
  curl -fsSL -X POST \
    -H "Authorization: Bearer ${PAT}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO}/actions/runners/registration-token" \
    | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -1 \
    | sed 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

# Garante a pasta base e o dono.
mkdir -p "$BASE_DIR"
chown -R "${RUNNER_USER}:${RUNNER_USER}" "$BASE_DIR"

# Baixa o tarball do runner uma única vez (compartilhado por todos).
if [ ! -f "$CACHE_TARBALL" ]; then
  echo "Baixando runner ${RUNNER_VERSION}..."
  sudo -u "$RUNNER_USER" curl -fsSL -o "$CACHE_TARBALL" "$DOWNLOAD_URL"
fi

for i in $(seq 1 "$COUNT"); do
  dir="${BASE_DIR}/runner-${i}"
  name="${LABEL}-runner-${i}"

  if [ -f "${dir}/.runner" ]; then
    echo "✓ runner-${i} (${name}) já configurado — pulando"
    continue
  fi

  echo "── Provisionando runner-${i} (${name}) ──"
  mkdir -p "$dir"
  chown -R "${RUNNER_USER}:${RUNNER_USER}" "$dir"

  # Extrai o runner na pasta (a partir do cache).
  sudo -u "$RUNNER_USER" tar xzf "$CACHE_TARBALL" -C "$dir"

  # Token fresco da API.
  token="$(api_registration_token)"
  if [ -z "$token" ]; then
    echo "Falha ao obter token de registro (cheque o PAT/permissões)." >&2
    exit 1
  fi

  # Configura (como o usuário do runner, não-root).
  sudo -u "$RUNNER_USER" bash -c "cd '$dir' && ./config.sh \
    --unattended \
    --url 'https://github.com/${REPO}' \
    --token '$token' \
    --name '$name' \
    --labels '$LABEL'"

  # Instala e inicia como serviço systemd rodando sob RUNNER_USER.
  ( cd "$dir" && ./svc.sh install "$RUNNER_USER" && ./svc.sh start )

  echo "✓ runner-${i} (${name}) instalado e rodando"
done

echo ""
echo "Pronto. Runners ativos:"
systemctl list-units 'actions.runner.*' --type=service --no-pager || true

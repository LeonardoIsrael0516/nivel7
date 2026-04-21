#!/usr/bin/env bash
# =============================================================================
# Nivel7 — instalador VPS via Docker (Ubuntu/Debian)
#
# Exemplo de uso via GitHub (troque USUARIO/REPO):
#   sudo NIVEL7_REPO_URL=https://github.com/USUARIO/REPO.git bash -c \
#     "$(curl -fsSL https://raw.githubusercontent.com/USUARIO/REPO/main/scripts/vps-docker-install.sh)"
#
# O script:
# - instala Docker + Compose plugin
# - clona/atualiza o repo em /opt/nivel7
# - cria backend/.env (API/worker) e .env na raiz (compose MySQL/portas)
# - gera JWTs automaticamente
# - sobe: mysql + redis + backend + worker
# - roda: prisma migrate deploy + seed (plans + admin)
# =============================================================================
set -euo pipefail

readonly R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' N='\033[0m'
info()  { echo -e "${B}[nivel7]${N} $*"; }
ok()    { echo -e "${G}[nivel7]${N} $*"; }
warn()  { echo -e "${Y}[nivel7]${N} $*"; }
err()   { echo -e "${R}[nivel7]${N} $*" >&2; }
abort() { err "$*"; exit 1; }

require_root() {
  [[ "${EUID:-0}" -eq 0 ]] || abort "Execute como root (sudo bash -c \"\$(curl ...)\" )"
}

detect_os() {
  [[ -f /etc/os-release ]] || abort "Nao foi possivel detectar o sistema (/etc/os-release ausente)."
  # shellcheck source=/dev/null
  . /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) ;;
    *) abort "So suportado Ubuntu ou Debian (detectado: ${ID:-unknown})" ;;
  esac
}

prompt() {
  local __var="$1" __text="$2" __def="${3:-}" __line
  if [[ -n "$__def" ]]; then
    read -r -p "$__text [$__def]: " __line || true
    printf -v "$__var" '%s' "${__line:-$__def}"
  else
    read -r -p "$__text: " __line || true
    printf -v "$__var" '%s' "$__line"
  fi
}

prompt_secret() {
  local __var="$1" __text="$2" __line
  read -r -s -p "$__text: " __line || true
  echo
  printf -v "$__var" '%s' "$__line"
}

strip_slash() { echo "${1%/}"; }

rand_hex() { openssl rand -hex "${1:-32}"; }

install_packages() {
  info "Instalando dependencias base..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg git openssl
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    ok "Docker ja instalado: $(docker --version)"
  else
    info "Instalando Docker (get.docker.com)..."
    curl -fsSL https://get.docker.com | sh
  fi

  # Compose plugin (docker compose)
  if docker compose version >/dev/null 2>&1; then
    ok "Docker Compose plugin ok: $(docker compose version)"
  else
    info "Instalando docker-compose-plugin..."
    apt-get update -y
    apt-get install -y docker-compose-plugin
    docker compose version >/dev/null 2>&1 || abort "docker compose nao ficou disponivel."
  fi

  systemctl enable --now docker || true
}

write_root_env_for_compose() {
  local file="$1"
  umask 077
  : >"$file"
  {
    printf 'MYSQL_DATABASE=%s\n' "$MYSQL_DATABASE"
    printf 'MYSQL_USER=%s\n' "$MYSQL_USER"
    printf 'MYSQL_PASSWORD=%s\n' "$MYSQL_PASSWORD"
    printf 'MYSQL_ROOT_PASSWORD=%s\n' "$MYSQL_ROOT_PASSWORD"
    printf 'BACKEND_PORT=%s\n' "$BACKEND_PORT"
  } >>"$file"
  chmod 600 "$file"
}

write_backend_env() {
  local file="$1"
  umask 077
  : >"$file"

  # Dentro do compose, os hosts sao os nomes dos servicos
  local db_url redis_url
  db_url="mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}?sslaccept=accept_invalid_certs"
  redis_url="redis://redis:6379"

  {
    printf '%s\n' "NODE_ENV=production"
    printf 'PORT=%s\n' "4000"
    printf 'APP_ORIGINS=%s\n' "$APP_ORIGINS"
    printf 'FRONTEND_BASE_URL=%s\n' "$FRONTEND_BASE_URL"
    printf 'DATABASE_URL=%s\n' "$db_url"
    printf 'REDIS_URL=%s\n' "$redis_url"
    printf 'JWT_ACCESS_SECRET=%s\n' "$JWT_ACCESS_SECRET"
    printf 'JWT_REFRESH_SECRET=%s\n' "$JWT_REFRESH_SECRET"
    printf 'ADMIN_EMAIL=%s\n' "$ADMIN_EMAIL"
    printf 'ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD"
    printf 'CAJUPAY_BASE_URL=%s\n' "$CAJUPAY_BASE_URL"
    printf 'CAJUPAY_API_KEY=%s\n' "$CAJUPAY_API_KEY"
    printf 'CAJUPAY_API_SECRET=%s\n' "$CAJUPAY_API_SECRET"
    printf 'CAJUPAY_WEBHOOK_SECRET=%s\n' "$CAJUPAY_WEBHOOK_SECRET"
    printf 'CAJUPAY_DEFAULT_CONSUMER_DOCUMENT=%s\n' "$CAJUPAY_DEFAULT_CONSUMER_DOCUMENT"
    printf 'SMTP_HOST=%s\n' "$SMTP_HOST"
    printf 'SMTP_PORT=%s\n' "$SMTP_PORT"
    printf 'SMTP_USER=%s\n' "$SMTP_USER"
    printf 'SMTP_PASS=%s\n' "$SMTP_PASS"
    printf 'SMTP_FROM=%s\n' "$SMTP_FROM"
  } >>"$file"

  chmod 600 "$file"
}

main() {
  require_root
  detect_os
  install_packages
  install_docker

  echo ""
  echo -e "${G}=== Nivel7 — instalador Docker ===${N}"
  echo ""

  local REPO_URL="${NIVEL7_REPO_URL:-}"
  if [[ -z "$REPO_URL" ]]; then
    prompt REPO_URL "URL do repositorio Git (HTTPS)" "https://github.com/SEU_USUARIO/nivel7.git"
  fi
  [[ -n "$REPO_URL" ]] || abort "URL do repositorio e obrigatoria."

  local INSTALL_DIR="${NIVEL7_INSTALL_DIR:-/opt/nivel7}"
  local GIT_BRANCH="${NIVEL7_GIT_BRANCH:-main}"

  local BACKEND_URL FRONTEND_URL
  prompt BACKEND_URL "URL publica da API (backend), ex.: https://api.seudominio.com" ""
  [[ -n "$BACKEND_URL" ]] || abort "URL do backend e obrigatoria."
  BACKEND_URL="$(strip_slash "$BACKEND_URL")"

  prompt FRONTEND_URL "URL publica do frontend, ex.: https://app.seudominio.com" ""
  [[ -n "$FRONTEND_URL" ]] || abort "URL do frontend e obrigatoria."
  FRONTEND_URL="$(strip_slash "$FRONTEND_URL")"

  prompt BACKEND_PORT "Porta externa para expor a API (Docker publish). Recomendo 80 para dominio" "80"

  local APP_ORIGINS_DEF="$FRONTEND_URL"
  prompt APP_ORIGINS "APP_ORIGINS (CORS; use virgula para varias origens)" "$APP_ORIGINS_DEF"
  APP_ORIGINS="${APP_ORIGINS:-$APP_ORIGINS_DEF}"

  FRONTEND_BASE_URL="$FRONTEND_URL"

  # MySQL (compose)
  prompt MYSQL_DATABASE "MySQL database" "nivel7"
  prompt MYSQL_USER "MySQL user" "nivel7"
  if [[ -n "${NIVEL7_MYSQL_PASSWORD:-}" ]]; then
    MYSQL_PASSWORD="$NIVEL7_MYSQL_PASSWORD"
  else
    prompt_secret MYSQL_PASSWORD "MySQL password (nao exibida)"
  fi
  [[ -n "$MYSQL_PASSWORD" ]] || abort "MYSQL_PASSWORD obrigatoria."
  if [[ -n "${NIVEL7_MYSQL_ROOT_PASSWORD:-}" ]]; then
    MYSQL_ROOT_PASSWORD="$NIVEL7_MYSQL_ROOT_PASSWORD"
  else
    prompt_secret MYSQL_ROOT_PASSWORD "MySQL root password (nao exibida)"
  fi
  [[ -n "$MYSQL_ROOT_PASSWORD" ]] || abort "MYSQL_ROOT_PASSWORD obrigatoria."

  # Admin
  prompt ADMIN_EMAIL "E-mail do admin" "admin@seudominio.com"
  if [[ -n "${NIVEL7_ADMIN_PASSWORD:-}" ]]; then
    ADMIN_PASSWORD="$NIVEL7_ADMIN_PASSWORD"
  else
    prompt_secret ADMIN_PASSWORD "Senha do admin (min 8)"
  fi
  [[ ${#ADMIN_PASSWORD} -ge 8 ]] || abort "Senha do admin deve ter no minimo 8 caracteres."

  # JWT
  JWT_ACCESS_SECRET="$(rand_hex 32)"
  JWT_REFRESH_SECRET="$(rand_hex 32)"
  ok "JWTs gerados."

  # CajuPay / SMTP (opcional)
  prompt CAJUPAY_BASE_URL "CajuPay base URL" "https://api.cajupay.com.br"
  prompt CAJUPAY_API_KEY "CajuPay API key (opcional)" ""
  prompt CAJUPAY_API_SECRET "CajuPay API secret (opcional)" ""
  prompt CAJUPAY_WEBHOOK_SECRET "CajuPay webhook secret (opcional)" ""
  prompt CAJUPAY_DEFAULT_CONSUMER_DOCUMENT "CPF padrao PIX (11 digitos)" "00000000191"
  [[ "$CAJUPAY_DEFAULT_CONSUMER_DOCUMENT" =~ ^[0-9]{11}$ ]] || abort "CPF deve ter 11 digitos."

  prompt SMTP_HOST "SMTP host (opcional)" ""
  prompt SMTP_PORT "SMTP port" "587"
  prompt SMTP_USER "SMTP user (opcional)" ""
  prompt_secret SMTP_PASS "SMTP pass (opcional)"
  prompt SMTP_FROM "SMTP from" "noreply@seudominio.com"

  info "Clonando/atualizando repo em ${INSTALL_DIR}..."
  mkdir -p "$INSTALL_DIR"
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    git -C "$INSTALL_DIR" fetch origin
    git -C "$INSTALL_DIR" checkout "$GIT_BRANCH"
    git -C "$INSTALL_DIR" pull origin "$GIT_BRANCH"
  else
    if [[ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null || true)" ]]; then
      abort "Diretorio $INSTALL_DIR nao esta vazio e nao e um clone git."
    fi
    git clone --branch "$GIT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi

  [[ -f "$INSTALL_DIR/docker-compose.yml" ]] || abort "docker-compose.yml nao encontrado no repo."
  [[ -d "$INSTALL_DIR/backend" ]] || abort "Pasta backend nao encontrada no repo."

  info "Gerando .env do compose e do backend..."
  write_root_env_for_compose "$INSTALL_DIR/.env"
  write_backend_env "$INSTALL_DIR/backend/.env"

  info "Subindo containers (build)..."
  (cd "$INSTALL_DIR" && docker compose up -d --build)

  info "Rodando migrations + seed (dentro do container backend)..."
  (cd "$INSTALL_DIR" && docker compose exec -T backend npx prisma migrate deploy)
  (cd "$INSTALL_DIR" && docker compose exec -T backend npm run db:seed)

  echo ""
  ok "Instalacao Docker concluida."
  echo ""
  echo -e "${B}Resumo:${N}"
  echo "  API:      ${BACKEND_URL} (porta externa ${BACKEND_PORT})"
  echo "  Frontend: ${FRONTEND_URL} (build: VITE_API_BASE_URL=${BACKEND_URL}/api)"
  echo "  Admin:    ${ADMIN_EMAIL}"
  echo ""
  echo "Comandos:"
  echo "  cd ${INSTALL_DIR}"
  echo "  docker compose ps"
  echo "  docker compose logs -f backend"
  echo "  docker compose logs -f worker"
}

main \"$@\"


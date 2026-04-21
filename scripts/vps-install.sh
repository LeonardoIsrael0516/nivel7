#!/usr/bin/env bash
# =============================================================================
# Nivel7 — instalador VPS (Ubuntu/Debian)
# Uso remoto (troque USER/REPO/branch):
#   sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/scripts/vps-install.sh)"
# Ou com repo ja definido:
#   sudo NIVEL7_REPO_URL=https://github.com/USER/REPO.git bash -c "$(curl -fsSL ...)"
# =============================================================================
set -euo pipefail

readonly R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' N='\033[0m'
info()  { echo -e "${B}[nivel7]${N} $*"; }
ok()    { echo -e "${G}[nivel7]${N} $*"; }
warn()  { echo -e "${Y}[nivel7]${N} $*"; }
err()   { echo -e "${R}[nivel7]${N} $*" >&2; }
abort() { err "$*"; exit 1; }

require_root() {
  [[ "${EUID:-0}" -eq 0 ]] || abort "Execute como root (ex.: sudo bash $0 ou sudo bash -c \"\$(curl ...)\")"
}

detect_os() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    OS_ID="${ID:-}"
    OS_VER="${VERSION_ID:-}"
  else
    abort "Nao foi possivel detectar o sistema (/etc/os-release ausente)."
  fi
  case "$OS_ID" in
    ubuntu|debian) ;;
    *) abort "So suportado Ubuntu ou Debian (detectado: $OS_ID)" ;;
  esac
}

prompt() {
  # $1 = nome da variavel destino, $2 = texto, $3 = default (opcional)
  local __def="${3:-}"
  local __line
  if [[ -n "$__def" ]]; then
    read -r -p "$2 [${__def}]: " __line || true
    printf -v "$1" '%s' "${__line:-$__def}"
  else
    read -r -p "$2: " __line || true
    printf -v "$1" '%s' "$__line"
  fi
}

prompt_secret() {
  local __n="$1" __t="$2" __l
  read -r -s -p "$__t: " __l || true
  echo
  printf -v "$__n" '%s' "$__l"
}

strip_slash() {
  echo "${1%/}"
}

rand_hex() {
  openssl rand -hex "${1:-32}"
}

install_base_packages() {
  info "Atualizando apt e instalando pacotes base..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y \
    ca-certificates curl gnupg git lsb-release openssl python3 \
    mysql-server redis-server \
    build-essential
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    local v
    v="$(node -v | sed 's/^v//;s/\..*//')"
    if [[ "${v:-0}" -ge 20 ]]; then
      ok "Node ja instalado: $(node -v)"
      return
    fi
  fi
  info "Instalando Node.js 22.x (NodeSource)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  ok "Node: $(node -v) / npm: $(npm -v)"
}

# Escapa aspas simples para uso dentro de string SQL entre aspas simples ('' = ')
esc_sql() {
  printf '%s' "$1" | sed "s/'/''/g"
}

ensure_mysql_db_user() {
  local db="$1" user="$2" pass="$3"
  local esc
  esc="$(esc_sql "$pass")"
  info "Criando banco e usuario MySQL (se nao existirem)..."
  mysql --protocol=socket -uroot <<SQL || abort "Falha ao configurar MySQL. Verifique se o servico mysql/mariadb esta ativo."
CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${user}'@'localhost' IDENTIFIED BY '${esc}';
ALTER USER '${user}'@'localhost' IDENTIFIED BY '${esc}';
GRANT ALL PRIVILEGES ON \`${db}\`.* TO '${user}'@'localhost';
FLUSH PRIVILEGES;
SQL
  ok "MySQL: database=${db} user=${user}"
}

write_env() {
  local env_file="$1"
  info "Escrevendo ${env_file}..."
  umask 077
  : >"$env_file"
  {
    printf '%s\n' "NODE_ENV=production"
    printf 'PORT=%s\n' "$BACKEND_PORT"
    printf '%s\n' "# CORS: origens do frontend (separadas por virgula)"
    printf 'APP_ORIGINS=%s\n' "$APP_ORIGINS"
    printf 'FRONTEND_BASE_URL=%s\n' "$FRONTEND_URL"
    printf 'DATABASE_URL=mysql://%s:%s@127.0.0.1:3306/%s?sslaccept=accept_invalid_certs\n" "$MYSQL_USER" "$MYSQL_PASS_ENC" "$MYSQL_DB"
    printf '%s\n' "REDIS_URL=redis://127.0.0.1:6379"
    printf 'JWT_ACCESS_SECRET=%s\n' "$JWT_ACCESS"
    printf 'JWT_REFRESH_SECRET=%s\n' "$JWT_REFRESH"
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
  } >>"$env_file"
  chmod 600 "$env_file"
  ok "Arquivo .env criado (permissao 600)."
}

install_systemd() {
  local dir="$1" run_user="$2"
  info "Instalando systemd: nivel7-api.service e nivel7-worker.service..."
  local node_bin
  node_bin="$(command -v node)"

  cat >/etc/systemd/system/nivel7-api.service <<EOF
[Unit]
Description=Nivel7 API (Fastify)
After=network-online.target mysql.service redis-server.service
Wants=network-online.target

[Service]
Type=simple
User=${run_user}
Group=${run_user}
WorkingDirectory=${dir}/backend
EnvironmentFile=${dir}/backend/.env
ExecStart=${node_bin} dist/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  cat >/etc/systemd/system/nivel7-worker.service <<EOF
[Unit]
Description=Nivel7 Worker (BullMQ)
After=network-online.target mysql.service redis-server.service
Wants=network-online.target

[Service]
Type=simple
User=${run_user}
Group=${run_user}
WorkingDirectory=${dir}/backend
EnvironmentFile=${dir}/backend/.env
ExecStart=${node_bin} dist/worker.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable nivel7-api nivel7-worker
  systemctl restart nivel7-api || true
  systemctl restart nivel7-worker || true
  ok "Servicos systemd configurados. Use: systemctl status nivel7-api nivel7-worker"
}

# -----------------------------------------------------------------------------
main() {
  require_root
  detect_os

  echo ""
  echo -e "${G}=== Nivel7 — instalador VPS ===${N}"
  echo "Este script instala: MySQL, Redis, Node.js 22, clona o repositorio, gera .env,"
  echo "roda migracoes Prisma, seed (planos + admin) e cria servicos systemd (API + worker)."
  echo ""

  local REPO_URL="${NIVEL7_REPO_URL:-}"
  if [[ -z "$REPO_URL" ]]; then
    prompt REPO_URL "URL do repositorio Git (HTTPS)" "https://github.com/SEU_USUARIO/nivel7.git"
  fi
  [[ -n "$REPO_URL" ]] || abort "URL do repositorio e obrigatoria (ou defina NIVEL7_REPO_URL)."

  local INSTALL_DIR="${NIVEL7_INSTALL_DIR:-}"
  if [[ -z "$INSTALL_DIR" ]]; then
    prompt INSTALL_DIR "Diretorio de instalacao" "/opt/nivel7"
  fi
  INSTALL_DIR="${INSTALL_DIR%/}"

  local GIT_BRANCH="${NIVEL7_GIT_BRANCH:-}"
  if [[ -z "$GIT_BRANCH" ]]; then
    prompt GIT_BRANCH "Branch Git" "main"
  fi

  local BACKEND_URL FRONTEND_URL
  prompt BACKEND_URL "URL publica da API (backend), ex.: https://api.seudominio.com" ""
  [[ -n "$BACKEND_URL" ]] || abort "URL do backend e obrigatoria."
  BACKEND_URL="$(strip_slash "$BACKEND_URL")"

  prompt FRONTEND_URL "URL publica do frontend (site), ex.: https://app.seudominio.com" ""
  [[ -n "$FRONTEND_URL" ]] || abort "URL do frontend e obrigatoria."
  FRONTEND_URL="$(strip_slash "$FRONTEND_URL")"

  local BACKEND_PORT="${NIVEL7_PORT:-}"
  if [[ -z "$BACKEND_PORT" ]]; then
    prompt BACKEND_PORT "Porta HTTP interna da API" "4000"
  fi

  local APP_ORIGINS_DEF="${FRONTEND_URL}"
  prompt APP_ORIGINS "APP_ORIGINS (CORS, separado por virgula). Enter = so o frontend acima" "${APP_ORIGINS_DEF}"
  APP_ORIGINS="${APP_ORIGINS:-$APP_ORIGINS_DEF}"
  APP_ORIGINS="$(echo "$APP_ORIGINS" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  local MYSQL_DB MYSQL_USER MYSQL_PASS
  prompt MYSQL_DB "Nome do banco MySQL" "nivel7"
  prompt MYSQL_USER "Usuario MySQL da aplicacao" "nivel7"
  if [[ -z "${NIVEL7_MYSQL_PASSWORD:-}" ]]; then
    prompt_secret MYSQL_PASS "Senha MySQL para o usuario '${MYSQL_USER}' (nao sera exibida)"
    [[ -n "$MYSQL_PASS" ]] || abort "Senha MySQL obrigatoria."
  else
    MYSQL_PASS="$NIVEL7_MYSQL_PASSWORD"
  fi

  local ADMIN_EMAIL ADMIN_PASSWORD
  prompt ADMIN_EMAIL "E-mail do usuario admin (painel /api/admin)" "admin@seudominio.com"
  if [[ -z "${NIVEL7_ADMIN_PASSWORD:-}" ]]; then
    prompt_secret ADMIN_PASSWORD "Senha do admin (min. 8 caracteres, nao exibida)"
  else
    ADMIN_PASSWORD="$NIVEL7_ADMIN_PASSWORD"
  fi
  [[ ${#ADMIN_PASSWORD} -ge 8 ]] || abort "Senha do admin deve ter no minimo 8 caracteres."

  local JWT_ACCESS JWT_REFRESH
  JWT_ACCESS="$(rand_hex 32)"
  JWT_REFRESH="$(rand_hex 32)"
  ok "JWT_ACCESS_SECRET e JWT_REFRESH_SECRET gerados (32 bytes hex cada)."

  local CAJUPAY_BASE_URL CAJUPAY_API_KEY CAJUPAY_API_SECRET CAJUPAY_WEBHOOK_SECRET CAJUPAY_DEFAULT_CONSUMER_DOCUMENT
  prompt CAJUPAY_BASE_URL "CajuPay API base URL" "https://api.cajupay.com.br"
  prompt CAJUPAY_API_KEY "CajuPay API Key (deixe vazio para configurar depois no admin)" ""
  prompt CAJUPAY_API_SECRET "CajuPay API Secret (deixe vazio para depois)" ""
  prompt CAJUPAY_WEBHOOK_SECRET "Segredo do webhook CajuPay (opcional; vazio = sem validacao de header)" ""
  prompt CAJUPAY_DEFAULT_CONSUMER_DOCUMENT "CPF padrao consumer PIX (11 digitos)" "00000000191"
  [[ "$CAJUPAY_DEFAULT_CONSUMER_DOCUMENT" =~ ^[0-9]{11}$ ]] || abort "CPF padrao deve ter exatamente 11 digitos."

  local SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM
  prompt SMTP_HOST "SMTP host (vazio = configurar depois)" ""
  prompt SMTP_PORT "SMTP porta" "587"
  prompt SMTP_USER "SMTP usuario" ""
  prompt_secret SMTP_PASS "SMTP senha (vazio se sem SMTP ainda)"
  prompt SMTP_FROM "SMTP From" "noreply@seudominio.com"

  # URL-encode password for DATABASE_URL (basic: handle @ : / etc via printf %q is wrong; use manual)
  local MYSQL_PASS_ENC
  MYSQL_PASS_ENC="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$MYSQL_PASS")"

  info "Instalando pacotes de sistema..."
  install_base_packages
  systemctl enable --now redis-server 2>/dev/null || systemctl enable --now redis 2>/dev/null || true
  systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb 2>/dev/null || true
  systemctl start mysql 2>/dev/null || systemctl start mariadb 2>/dev/null || true
  systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true

  ensure_mysql_db_user "$MYSQL_DB" "$MYSQL_USER" "$MYSQL_PASS"

  install_node

  local RUN_USER="${NIVEL7_RUN_USER:-nivel7}"
  if ! id -u "$RUN_USER" >/dev/null 2>&1; then
    useradd --system --shell /usr/sbin/nologin --home /nonexistent --no-create-home "$RUN_USER"
  fi

  info "Preparando diretorio ${INSTALL_DIR}..."
  mkdir -p "$INSTALL_DIR"
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    warn "Diretorio ja e um git repo. Fazendo fetch/pull em ${GIT_BRANCH}..."
    git -C "$INSTALL_DIR" fetch origin
    git -C "$INSTALL_DIR" checkout "$GIT_BRANCH"
    git -C "$INSTALL_DIR" pull origin "$GIT_BRANCH" || warn "git pull falhou — verifique manualmente."
  else
    if [[ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null || true)" ]]; then
      abort "Diretorio $INSTALL_DIR nao esta vazio e nao e um clone git. Esvazie ou escolha outro caminho."
    fi
    git clone --branch "$GIT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi

  chown -R "$RUN_USER:$RUN_USER" "$INSTALL_DIR"

  local backend_dir="$INSTALL_DIR/backend"
  [[ -d "$backend_dir" ]] || abort "Pasta backend nao encontrada em $backend_dir (estrutura do repo incorreta?)."

  write_env "$backend_dir/.env"

  info "npm ci + build backend (como ${RUN_USER})..."
  sudo -u "$RUN_USER" bash -c "set -e; cd '$backend_dir' && npm ci && npm run build"

  info "Prisma migrate deploy + seed (admin + planos)..."
  sudo -u "$RUN_USER" bash -c "set -e; cd '$backend_dir' && npx prisma migrate deploy && npm run db:seed"

  install_systemd "$INSTALL_DIR" "$RUN_USER"
  systemctl restart nivel7-api
  systemctl restart nivel7-worker

  echo ""
  ok "Instalacao concluida."
  echo ""
  echo -e "${B}Resumo:${N}"
  echo "  Repo:       $INSTALL_DIR (branch $GIT_BRANCH)"
  echo "  API publica: $BACKEND_URL (internamente escuta na porta ${BACKEND_PORT}; use proxy HTTPS -> 127.0.0.1:${BACKEND_PORT})"
  echo "  Frontend:   $FRONTEND_URL (build com VITE_API_BASE_URL=${BACKEND_URL}/api)"
  echo "  Admin:      $ADMIN_EMAIL"
  echo "  Systemd:    systemctl status nivel7-api nivel7-worker"
  echo "  Logs:       journalctl -u nivel7-api -f"
  echo ""
  warn "Proximos passos: proxy reverso (HTTPS), firewall (ufw allow 22,80,443), e variaveis CajuPay/SMTP se ainda vazias."
}

main "$@"

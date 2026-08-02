#!/usr/bin/env bash
set -euo pipefail

# ============================================
# FamilyPost backend one-shot deploy script
# ============================================
# Secrets are never hardcoded/defaulted here - they must already exist as
# environment variables on the host (or be exported right before running
# this script, e.g. `export LEMON_SQUEEZY_API_KEY='...'`). Using bash's
# "${VAR:?message}" form makes the script abort immediately with a precise
# per-variable error instead of silently falling back to a placeholder that
# then gets baked into the container's .env (which is how the backend ended
# up logging `variantId: 'REPLACE_WITH_LEMON_SQUEEZY_VARIANT_ID'` and
# `password authentication failed for user "postgres"`).
# Non-secret values below keep sensible defaults.
API_DOMAIN="${API_DOMAIN:-api.foto-post-weltweit.de}"
# Allow the production frontend plus the current temporary Netlify deploy URL.
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://foto-post-weltweit.de,https://www.foto-post-weltweit.de,https://6a566eee41c42012a80dac40--foto-post-weltweit.netlify.app}"
API_BASE_URL="${API_BASE_URL:-https://api.foto-post-weltweit.de}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-https://foto-post-weltweit.de}"
MYPOSTCARD_API_KEY="${MYPOSTCARD_API_KEY:?ERROR: MYPOSTCARD_API_KEY is not set on the host. Export it before running this script.}"
MYPOSTCARD_USERNAME="${MYPOSTCARD_USERNAME:?ERROR: MYPOSTCARD_USERNAME is not set on the host. Export it before running this script.}"
MYPOSTCARD_PASSWORD="${MYPOSTCARD_PASSWORD:?ERROR: MYPOSTCARD_PASSWORD is not set on the host. Export it before running this script.}"
MYPOSTCARD_CAMPAIGN_ID="${MYPOSTCARD_CAMPAIGN_ID:-}"
MYPOSTCARD_API_BASE_URL="${MYPOSTCARD_API_BASE_URL:-https://www.mypostcard.com}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://foto-post-weltweit.de}"
LEMON_SQUEEZY_API_KEY="${LEMON_SQUEEZY_API_KEY:?ERROR: LEMON_SQUEEZY_API_KEY is not set on the host. Export it before running this script.}"
LEMON_SQUEEZY_STORE_ID="${LEMON_SQUEEZY_STORE_ID:?ERROR: LEMON_SQUEEZY_STORE_ID is not set on the host. Export it before running this script.}"
LEMON_SQUEEZY_VARIANT_ID="${LEMON_SQUEEZY_VARIANT_ID:?ERROR: LEMON_SQUEEZY_VARIANT_ID is not set on the host. Export it before running this script.}"
LEMON_SQUEEZY_VARIANT_ID_SINGLE="${LEMON_SQUEEZY_VARIANT_ID_SINGLE:-}"
LEMON_SQUEEZY_VARIANT_ID_FAMILY_5="${LEMON_SQUEEZY_VARIANT_ID_FAMILY_5:-}"
LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10="${LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10:-}"
LEMON_SQUEEZY_TEST_MODE="${LEMON_SQUEEZY_TEST_MODE:-true}"
SMTP_HOST="${SMTP_HOST:?ERROR: SMTP_HOST is not set on the host. Export it before running this script.}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:?ERROR: SMTP_USER is not set on the host. Export it before running this script.}"
SMTP_PASSWORD="${SMTP_PASSWORD:?ERROR: SMTP_PASSWORD is not set on the host. Export it before running this script.}"
SMTP_FROM="${SMTP_FROM:-\"Family Post <no-reply@foto-post-weltweit.de>\"}"
SMTP_SECURE="${SMTP_SECURE:-false}"
JWT_SECRET="${JWT_SECRET:?ERROR: JWT_SECRET is not set on the host. Export it before running this script.}"
DB_HOST="${DB_HOST:-familypost_db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-familypost}"
DB_USER="${DB_USER:-postgres}"
# DATABASE_URL is accepted as an alias for DB_URL (a full Postgres connection
# string), matching common hosting conventions. Either DB_URL/DATABASE_URL or
# DB_PASSWORD must be set - both are exported as-is with no placeholder default.
DB_URL="${DB_URL:-${DATABASE_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  DB_PASSWORD="${DB_PASSWORD:?ERROR: Neither DB_URL/DATABASE_URL nor DB_PASSWORD is set on the host. Export one of them before running this script.}"
else
  DB_PASSWORD="${DB_PASSWORD:-}"
fi
DB_SSL="${DB_SSL:-false}"
PORT="${PORT:-3000}"
CERT_FALLBACK_DOMAIN="${CERT_FALLBACK_DOMAIN:-}"
DOCKER_PORT_MAPPING="${DOCKER_PORT_MAPPING:-${PORT}:3000}"
BACKEND_UPSTREAM_HOST="${BACKEND_UPSTREAM_HOST:-localhost}"
DOCKER_NETWORK="${DOCKER_NETWORK:-family_post_default}"

# Target paths and names
APP_DIR="/opt/familypost"
CONTAINER_NAME="familypost-backend"
IMAGE_NAME="familypost-backend:latest"
NGINX_SITE_PATH="/etc/nginx/sites-available/${API_DOMAIN}"
NGINX_SITE_LINK="/etc/nginx/sites-enabled/${API_DOMAIN}"
CERT_PATH_PRIMARY="/etc/letsencrypt/live/${API_DOMAIN}"
CERT_PATH_FALLBACK="${CERT_FALLBACK_DOMAIN:+/etc/letsencrypt/live/${CERT_FALLBACK_DOMAIN}}"
REPO_URL="https://github.com/martlew/family_post.git"
REPO_BRANCH="master"

# Path detection (monorepo root vs server subfolder)
DOCKERFILE_REL_PATH="Dockerfile"
ENV_REL_PATH=".env"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root (or via sudo)."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install Docker first."
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not found. Install Nginx first."
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync not found. Installing rsync..."
  apt-get update -y
  apt-get install -y rsync
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git not found. Installing git..."
  apt-get update -y
  apt-get install -y git
fi

mkdir -p "${APP_DIR}"

# 1) Ensure app code exists/updates in /opt/familypost
if [[ "${SCRIPT_DIR}" == "${APP_DIR}" ]]; then
  if [[ ! -d "${APP_DIR}/.git" ]]; then
    rm -rf "${APP_DIR:?}"/*
    git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
  else
    git -C "${APP_DIR}" fetch origin "${REPO_BRANCH}"
    git -C "${APP_DIR}" reset --hard "origin/${REPO_BRANCH}"
  fi
else
  if [[ -d "${SCRIPT_DIR}/.git" ]]; then
    git -C "${SCRIPT_DIR}" fetch origin "${REPO_BRANCH}" || true
    git -C "${SCRIPT_DIR}" reset --hard "origin/${REPO_BRANCH}" || true
  fi
  rsync -a --delete "${SCRIPT_DIR}/" "${APP_DIR}/"
fi

# Fail fast instead of silently deploying placeholder secrets (this is how a
# forgotten `export DB_PASSWORD=...` used to end up as a literal
# "REPLACE_WITH_POSTGRES_PASSWORD" string in production, which Postgres then
# rejects with "password authentication failed for user postgres").
for var_name in MYPOSTCARD_API_KEY MYPOSTCARD_USERNAME MYPOSTCARD_PASSWORD LEMON_SQUEEZY_API_KEY LEMON_SQUEEZY_STORE_ID LEMON_SQUEEZY_VARIANT_ID SMTP_HOST SMTP_USER SMTP_PASSWORD JWT_SECRET DB_PASSWORD; do
  var_value="${!var_name}"
  if [[ "${var_value}" == REPLACE_WITH_* ]]; then
    echo "ERROR: ${var_name} is still set to a placeholder value (${var_value})." >&2
    echo "Export the real secret before running this script, e.g.: export ${var_name}='...'" >&2
    exit 1
  fi
done

# Write backend env file used by docker run
cat > "${APP_DIR}/${ENV_REL_PATH}" <<EOF
PORT=${PORT}
NODE_ENV=production
FRONTEND_ORIGIN=${FRONTEND_ORIGIN}
API_BASE_URL=${API_BASE_URL}
PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
FRONTEND_BASE_URL=${FRONTEND_BASE_URL}
MYPOSTCARD_API_KEY=${MYPOSTCARD_API_KEY}
MYPOSTCARD_USERNAME=${MYPOSTCARD_USERNAME}
MYPOSTCARD_PASSWORD=${MYPOSTCARD_PASSWORD}
MYPOSTCARD_CAMPAIGN_ID=${MYPOSTCARD_CAMPAIGN_ID}
MYPOSTCARD_API_BASE_URL=${MYPOSTCARD_API_BASE_URL}
LEMON_SQUEEZY_API_KEY=${LEMON_SQUEEZY_API_KEY}
LEMON_SQUEEZY_STORE_ID=${LEMON_SQUEEZY_STORE_ID}
LEMON_SQUEEZY_VARIANT_ID=${LEMON_SQUEEZY_VARIANT_ID}
LEMON_SQUEEZY_VARIANT_ID_SINGLE=${LEMON_SQUEEZY_VARIANT_ID_SINGLE}
LEMON_SQUEEZY_VARIANT_ID_FAMILY_5=${LEMON_SQUEEZY_VARIANT_ID_FAMILY_5}
LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10=${LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10}
LEMON_SQUEEZY_TEST_MODE=${LEMON_SQUEEZY_TEST_MODE}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_FROM}
SMTP_SECURE=${SMTP_SECURE}
JWT_SECRET=${JWT_SECRET}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=${DB_SSL}
DB_URL=${DB_URL}
EOF

# 2) Build and run Docker backend on localhost:3000
cd "${APP_DIR}"
docker builder prune -f >/dev/null 2>&1 || true
docker build --no-cache --pull -f "server/Dockerfile" -t "${IMAGE_NAME}" .

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "${DOCKER_NETWORK}" \
  --env-file "${APP_DIR}/${ENV_REL_PATH}" \
  -v "${APP_DIR}/${ENV_REL_PATH}:/app/.env:ro" \
  -p "${DOCKER_PORT_MAPPING}" \
  "${IMAGE_NAME}"

# 3) Create/update Nginx reverse proxy site and reload Nginx
SSL_CERT="${CERT_PATH_PRIMARY}/fullchain.pem"
SSL_KEY="${CERT_PATH_PRIMARY}/privkey.pem"

if [[ ! -f "${SSL_CERT}" || ! -f "${SSL_KEY}" ]]; then
  if [[ -n "${CERT_PATH_FALLBACK}" ]]; then
    SSL_CERT="${CERT_PATH_FALLBACK}/fullchain.pem"
    SSL_KEY="${CERT_PATH_FALLBACK}/privkey.pem"
  fi
fi

if [[ ! -f "${SSL_CERT}" || ! -f "${SSL_KEY}" ]]; then
  FIND_PATTERN_ARGS=( -name "${API_DOMAIN}*" )
  if [[ -n "${CERT_FALLBACK_DOMAIN}" ]]; then
    FIND_PATTERN_ARGS+=( -o -name "${CERT_FALLBACK_DOMAIN}*" )
  fi
  CERT_DIR_GUESS="$(find /etc/letsencrypt/live -maxdepth 1 -mindepth 1 -type d \( "${FIND_PATTERN_ARGS[@]}" \) | head -n 1 || true)"
  if [[ -n "${CERT_DIR_GUESS}" ]]; then
    SSL_CERT="${CERT_DIR_GUESS}/fullchain.pem"
    SSL_KEY="${CERT_DIR_GUESS}/privkey.pem"
  fi
fi

if [[ -f "${SSL_CERT}" && -f "${SSL_KEY}" ]]; then
cat > "${NGINX_SITE_PATH}" <<EOF
server {
    listen 80;
    server_name ${API_DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${API_DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    client_max_body_size 20m;

    location / {
      proxy_pass http://${BACKEND_UPSTREAM_HOST}:${PORT};
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 60s;
        proxy_connect_timeout 15s;
    }
}
EOF

ln -sf "${NGINX_SITE_PATH}" "${NGINX_SITE_LINK}"

nginx -t
systemctl restart nginx
else
  echo "Warning: No valid Let's Encrypt certificate found. Skipping Nginx site rewrite."
fi

# Basic health check with retries
HEALTH_URL="http://${BACKEND_UPSTREAM_HOST}:${PORT}/api/auth/health"
for i in {1..20}; do
  if curl -fsS "${HEALTH_URL}" >/dev/null; then
    echo "Deploy successful: backend healthy and Nginx reloaded."
    exit 0
  fi
  sleep 1
done

echo "Deploy completed, but backend health check failed after retries. Check logs:"
echo "  docker logs ${CONTAINER_NAME}"
exit 1

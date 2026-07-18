#!/usr/bin/env bash
set -euo pipefail

# ============================================
# FamilyPost backend one-shot deploy script
# ============================================
# Fill these values before first run.
API_DOMAIN="${API_DOMAIN:-api.foto-post-weltweit.de}"
# Allow the production frontend plus the current temporary Netlify deploy URL.
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://foto-post-weltweit.de,https://www.foto-post-weltweit.de,https://6a566eee41c42012a80dac40--foto-post-weltweit.netlify.app}"
API_BASE_URL="${API_BASE_URL:-https://api.foto-post-weltweit.de}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-https://foto-post-weltweit.de}"
ECHTPOST_API_KEY="${ECHTPOST_API_KEY:-REPLACE_WITH_ECHTPOST_API_KEY}"
ECHTPOST_API_URL="${ECHTPOST_API_URL:-https://api.echtpost.example/postcards}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://foto-post-weltweit.de}"
LEMON_SQUEEZY_API_KEY="${LEMON_SQUEEZY_API_KEY:-REPLACE_WITH_LEMON_SQUEEZY_API_KEY}"
LEMON_SQUEEZY_STORE_ID="${LEMON_SQUEEZY_STORE_ID:-REPLACE_WITH_LEMON_SQUEEZY_STORE_ID}"
LEMON_SQUEEZY_VARIANT_ID="${LEMON_SQUEEZY_VARIANT_ID:-REPLACE_WITH_LEMON_SQUEEZY_VARIANT_ID}"
LEMON_SQUEEZY_TEST_MODE="${LEMON_SQUEEZY_TEST_MODE:-true}"
SMTP_HOST="${SMTP_HOST:-REPLACE_WITH_SMTP_HOST}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-REPLACE_WITH_SMTP_USER}"
SMTP_PASSWORD="${SMTP_PASSWORD:-REPLACE_WITH_SMTP_PASSWORD}"
SMTP_FROM="${SMTP_FROM:-\"Family Post <no-reply@foto-post-weltweit.de>\"}"
SMTP_SECURE="${SMTP_SECURE:-false}"
JWT_SECRET="${JWT_SECRET:-REPLACE_WITH_STRONG_JWT_SECRET}"
DB_HOST="${DB_HOST:-familypost_db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-familypost}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-REPLACE_WITH_POSTGRES_PASSWORD}"
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

# Write backend env file used by docker run
cat > "${APP_DIR}/${ENV_REL_PATH}" <<EOF
PORT=${PORT}
NODE_ENV=production
FRONTEND_ORIGIN=${FRONTEND_ORIGIN}
API_BASE_URL=${API_BASE_URL}
PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
FRONTEND_BASE_URL=${FRONTEND_BASE_URL}
ECHTPOST_API_KEY=${ECHTPOST_API_KEY}
ECHTPOST_API_URL=${ECHTPOST_API_URL}
LEMON_SQUEEZY_API_KEY=${LEMON_SQUEEZY_API_KEY}
LEMON_SQUEEZY_STORE_ID=${LEMON_SQUEEZY_STORE_ID}
LEMON_SQUEEZY_VARIANT_ID=${LEMON_SQUEEZY_VARIANT_ID}
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

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/familypost}"
CONTAINER_NAME="${CONTAINER_NAME:-familypost-backend}"
IMAGE_NAME="${IMAGE_NAME:-familypost-backend:latest}"
PORT="${PORT:-3000}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"
DOCKER_NETWORK="${DOCKER_NETWORK:-family_post_default}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root (or via sudo)."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install Docker first."
  exit 1
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory not found: ${APP_DIR}"
  exit 1
fi

cd "${APP_DIR}"

if [[ ! -f "server/Dockerfile" ]]; then
  echo "Missing server/Dockerfile in ${APP_DIR}"
  exit 1
fi

docker builder prune -f >/dev/null 2>&1 || true
docker build --no-cache --pull -f "server/Dockerfile" -t "${IMAGE_NAME}" .

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "${DOCKER_NETWORK}" \
  --env-file "${ENV_FILE}" \
  -v "${APP_DIR}/.env:/app/.env:ro" \
  -p "${PORT}:3000" \
  "${IMAGE_NAME}"

echo "Rebuild complete: ${IMAGE_NAME} is running on port ${PORT}."
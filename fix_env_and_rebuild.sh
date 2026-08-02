#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/familypost}"
CONTAINER_NAME="${CONTAINER_NAME:-familypost-backend}"
IMAGE_NAME="${IMAGE_NAME:-familypost-backend:latest}"
PORT="${PORT:-3000}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"
DOCKER_NETWORK="${DOCKER_NETWORK:-family_post_default}"
REPO_BRANCH="${REPO_BRANCH:-master}"

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

# Always sync to the latest pushed commit before rebuilding, otherwise this
# script only re-packages whatever code happens to already be on disk (which
# may be stale even with --no-cache, since --no-cache only skips Docker's
# layer cache, not the source files themselves).
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "Syncing ${APP_DIR} to origin/${REPO_BRANCH}..."
  git fetch origin "${REPO_BRANCH}"
  git reset --hard "origin/${REPO_BRANCH}"
else
  echo "Warning: ${APP_DIR} is not a git checkout, skipping code sync. Rebuilding whatever is on disk."
fi

if [[ ! -f "server/Dockerfile" ]]; then
  echo "Missing server/Dockerfile in ${APP_DIR}"
  exit 1
fi

# Fail fast only if a critical secret (payments API key or DB password) still
# carries a placeholder value - that's what causes "password authentication
# failed for user postgres" at runtime instead of a clear error here. Other
# vars (print-partner keys, SMTP, variant IDs) just get a warning so this
# script doesn't block a rebuild over unrelated missing features.
if [[ -f "${ENV_FILE}" ]]; then
  if grep -qE '^(LEMON_SQUEEZY_API_KEY|DB_PASSWORD|DB_URL)=REPLACE_WITH_' "${ENV_FILE}"; then
    echo "ERROR: ${ENV_FILE} still contains a placeholder for a critical secret:" >&2
    grep -E '^(LEMON_SQUEEZY_API_KEY|DB_PASSWORD|DB_URL)=REPLACE_WITH_' "${ENV_FILE}" >&2
    echo "Fix the real value(s) in ${ENV_FILE} (e.g. via ./setup_env.sh) before rebuilding." >&2
    exit 1
  fi
  if grep -q '=REPLACE_WITH_\|=DUMMY_NOT_CONFIGURED' "${ENV_FILE}"; then
    echo "WARNING: ${ENV_FILE} still has unconfigured non-critical values:" >&2
    grep '=REPLACE_WITH_\|=DUMMY_NOT_CONFIGURED' "${ENV_FILE}" >&2
    echo "The related features won't work until you set them, e.g. via ./setup_env.sh." >&2
  fi
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

# Basic health check with retries so a broken build fails loudly instead of
# silently leaving the old container's replacement half-started.
HEALTH_URL="http://localhost:${PORT}/api/auth/health"
for i in {1..20}; do
  if curl -fsS "${HEALTH_URL}" >/dev/null; then
    echo "Health check passed: backend is responding on port ${PORT}."
    exit 0
  fi
  sleep 1
done

echo "Warning: health check failed after retries. Check logs:"
echo "  docker logs ${CONTAINER_NAME}"
exit 1
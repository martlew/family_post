#!/usr/bin/env bash
set -euo pipefail

# Updates MYPOSTCARD_API_KEY/USERNAME/PASSWORD/CAMPAIGN_ID in an already
# deployed .env and recreates the backend container so the new values take
# effect (docker restart alone does NOT re-read --env-file).
#
# Usage (on the server, as root):
#   export MYPOSTCARD_API_KEY='...'
#   export MYPOSTCARD_USERNAME='...'
#   export MYPOSTCARD_PASSWORD='...'      # may safely contain $ / @ / etc.
#   export MYPOSTCARD_CAMPAIGN_ID='...'   # optional
#   ./sync_mypostcard_env.sh
#
# Real secrets are intentionally NOT hardcoded in this script - anything
# committed to git stays in the repo history forever. Export the values as
# shown above right before running it instead.

APP_DIR="${APP_DIR:-/opt/familypost}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"
CONTAINER_NAME="${CONTAINER_NAME:-familypost-backend}"
IMAGE_NAME="${IMAGE_NAME:-familypost-backend:latest}"
DOCKER_NETWORK="${DOCKER_NETWORK:-family_post_default}"
PORT="${PORT:-3000}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root (or via sudo)." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found." >&2
  exit 1
fi

: "${MYPOSTCARD_API_KEY:?ERROR: export MYPOSTCARD_API_KEY before running this script.}"
: "${MYPOSTCARD_USERNAME:?ERROR: export MYPOSTCARD_USERNAME before running this script.}"
: "${MYPOSTCARD_PASSWORD:?ERROR: export MYPOSTCARD_PASSWORD before running this script.}"
MYPOSTCARD_CAMPAIGN_ID="${MYPOSTCARD_CAMPAIGN_ID:-}"

# Reads each value from the shell environment via awk's -v (never interpolated
# into the awk program text), so special characters like $ in the password
# are never re-expanded by the shell or misparsed by awk.
set_env_value() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  awk -v k="${key}" -v v="${value}" -F= 'BEGIN{OFS="="; found=0} $1==k{print k,v; found=1; next} {print} END{if(!found) print k,v}' "${ENV_FILE}" > "${tmp}"
  mv "${tmp}" "${ENV_FILE}"
}

set_env_value MYPOSTCARD_API_KEY "${MYPOSTCARD_API_KEY}"
set_env_value MYPOSTCARD_USERNAME "${MYPOSTCARD_USERNAME}"
set_env_value MYPOSTCARD_PASSWORD "${MYPOSTCARD_PASSWORD}"
set_env_value MYPOSTCARD_CAMPAIGN_ID "${MYPOSTCARD_CAMPAIGN_ID}"

echo "Updated MyPostcard credentials in ${ENV_FILE}."

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "${DOCKER_NETWORK}" \
  --env-file "${ENV_FILE}" \
  -v "${ENV_FILE}:/app/.env:ro" \
  -p "${PORT}:3000" \
  "${IMAGE_NAME}"

echo "Recreated ${CONTAINER_NAME} from the existing image (no rebuild needed - only env values changed)."

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

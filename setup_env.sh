#!/usr/bin/env bash
set -euo pipefail

# Interactive helper to fill in /opt/familypost/.env without needing nano.
# Usage: sudo ./setup_env.sh [path-to-env-file]
# Press Enter on any prompt to keep the current value.

ENV_FILE="${1:-/opt/familypost/.env}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root (or via sudo)."
  exit 1
fi

touch "${ENV_FILE}"

get_current() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" 2>/dev/null | tail -n1 | cut -d= -f2-
}

set_value() {
  local key="$1" value="$2" tmp
  if grep -qE "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    tmp="$(mktemp)"
    awk -v k="${key}" -v v="${value}" -F= 'BEGIN{OFS="="} $1==k{print k"="v; next} {print}' "${ENV_FILE}" > "${tmp}"
    mv "${tmp}" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

prompt_field() {
  local key="$1" label="$2" secret="${3:-false}" current shown input
  current="$(get_current "${key}")"
  shown="${current:-<leer>}"
  [[ "${secret}" == "true" && -n "${current}" ]] && shown="********"

  if [[ "${secret}" == "true" ]]; then
    read -r -s -p "${label} [aktuell: ${shown}] (Enter = behalten): " input
    echo
  else
    read -r -p "${label} [aktuell: ${shown}] (Enter = behalten): " input
  fi

  if [[ -n "${input}" ]]; then
    set_value "${key}" "${input}"
  fi
}

echo "=== FamilyPost .env Setup (${ENV_FILE}) ==="
echo "Enter druecken, um einen vorhandenen Wert zu behalten."
echo

echo "--- Lemon Squeezy (Checkout) ---"
prompt_field LEMON_SQUEEZY_API_KEY "API Key" true
prompt_field LEMON_SQUEEZY_STORE_ID "Store ID (Default 429090, falls leer)"
prompt_field LEMON_SQUEEZY_VARIANT_ID "Basis-Variant-ID (Fallback fuer alle Plaene)"
prompt_field LEMON_SQUEEZY_VARIANT_ID_SINGLE "  -> Variant-ID Einzelticket (optional)"
prompt_field LEMON_SQUEEZY_VARIANT_ID_FAMILY_5 "  -> Variant-ID 5er-Paket (optional)"
prompt_field LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10 "  -> Variant-ID 10er-Paket (optional)"

echo
echo "--- Postgres (Payment Drafts) ---"
prompt_field DB_PASSWORD "Passwort des familypost_db Containers" true
prompt_field DB_URL "Alternative: vollstaendige DB_URL (optional, hat Vorrang vor DB_PASSWORD)" true

echo
echo "--- MyPostcard (Druck & Versand) ---"
prompt_field MYPOSTCARD_API_KEY "API Key" true
prompt_field MYPOSTCARD_USERNAME "Username"
prompt_field MYPOSTCARD_PASSWORD "Passwort" true

echo
echo "--- SMTP (Passwort-Reset-Mail) ---"
prompt_field SMTP_HOST "Host"
prompt_field SMTP_USER "User"
prompt_field SMTP_PASSWORD "Passwort" true

echo
echo "--- Sonstiges ---"
prompt_field JWT_SECRET "JWT Secret" true

echo
echo "Fertig. ${ENV_FILE} wurde aktualisiert."
echo "Zum Uebernehmen den Container neu bauen: sudo ./fix_env_and_rebuild.sh"

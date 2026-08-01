#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Fix Nginx for foto-post-weltweit.de (root domain)
# - Disables other Nginx sites that also declare this server_name
#   (fixes "conflicting server name ... ignored" warnings)
# - Serves /sitemap.xml and /robots.txt as static files (copied out of the
#   running backend container) instead of proxying them to Node
# - Proxies everything else to the familypost-backend Docker container
# ============================================

DOMAIN="${DOMAIN:-foto-post-weltweit.de}"
WWW_DOMAIN="${WWW_DOMAIN:-www.foto-post-weltweit.de}"
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-127.0.0.1:3000}"
CONTAINER_NAME="${CONTAINER_NAME:-familypost-backend}"
STATIC_ROOT="${STATIC_ROOT:-/opt/familypost/dist/public}"
# nginx.conf on this host includes sites by fixed filename (not a sites-enabled/*
# wildcard), so the existing site file for the root domain must be overwritten
# in place rather than replaced by a new "${DOMAIN}"-named file.
SITE_NAME="${SITE_NAME:-familypost}"

NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_SITE_PATH="${NGINX_SITES_AVAILABLE}/${SITE_NAME}"
NGINX_SITE_LINK="${NGINX_SITES_ENABLED}/${SITE_NAME}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root (or via sudo)."
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not found. Install Nginx first."
  exit 1
fi

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
SSL_CERT="${CERT_PATH}/fullchain.pem"
SSL_KEY="${CERT_PATH}/privkey.pem"

if [[ ! -f "${SSL_CERT}" || ! -f "${SSL_KEY}" ]]; then
  echo "Error: No Let's Encrypt certificate found at ${CERT_PATH}."
  echo "Issue a certificate for ${DOMAIN} first, then re-run this script."
  exit 1
fi

# 1) Disable every other Nginx site that already declares this exact server_name
#    (as a whole token, so "api.${DOMAIN}" is never matched), so only the
#    config written below stays active.
echo "Checking for conflicting Nginx server blocks for ${DOMAIN}..."

file_has_domain_conflict() {
  local file="$1" line token
  while IFS= read -r line; do
    line="${line#*server_name}"
    line="${line%%;*}"
    for token in ${line}; do
      if [[ "${token}" == "${DOMAIN}" || "${token}" == "${WWW_DOMAIN}" ]]; then
        return 0
      fi
    done
  done < <(grep -E '^[[:space:]]*server_name\b' "${file}" 2>/dev/null || true)
  return 1
}

for file in "${NGINX_SITES_AVAILABLE}"/*; do
  [[ -e "${file}" ]] || continue
  [[ "${file}" == "${NGINX_SITE_PATH}" ]] && continue
  file_has_domain_conflict "${file}" || continue

  # Remove the matching sites-enabled symlink (by basename) *before* renaming
  # the sites-available file, otherwise it's left behind as a dangling symlink
  # that still breaks `nginx -t` via the sites-enabled/* wildcard include.
  link="${NGINX_SITES_ENABLED}/$(basename "${file}")"
  if [[ -e "${link}" || -L "${link}" ]]; then
    echo "  Unlinking conflicting site: ${link}"
    rm -f "${link}"
  fi
  echo "  Disabling conflicting config: ${file} -> ${file}.disabled"
  mv -f "${file}" "${file}.disabled"
done

# Clean up any sites-enabled entries not handled above: dangling symlinks left
# over from previous (buggy) runs, and any remaining conflicting entries.
for file in "${NGINX_SITES_ENABLED}"/*; do
  [[ -e "${file}" || -L "${file}" ]] || continue
  [[ "${file}" == "${NGINX_SITE_LINK}" ]] && continue

  if [[ -L "${file}" && ! -e "${file}" ]]; then
    echo "  Removing dangling symlink: ${file}"
    rm -f "${file}"
    continue
  fi

  file_has_domain_conflict "${file}" || continue
  echo "  Unlinking conflicting site: ${file}"
  rm -f "${file}"
done

# 2) Copy the built frontend (incl. sitemap.xml / robots.txt) out of the
#    running backend container so Nginx can serve them directly as static files.
mkdir -p "${STATIC_ROOT}"
if docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  if ! docker cp "${CONTAINER_NAME}:/app/dist/public/." "${STATIC_ROOT}/"; then
    echo "Warning: 'docker cp' from ${CONTAINER_NAME}:/app/dist/public failed (see error above)."
  fi
else
  echo "Warning: container ${CONTAINER_NAME} not found (docker inspect failed)."
fi

STATIC_AVAILABLE=false
if [[ -f "${STATIC_ROOT}/sitemap.xml" ]]; then
  STATIC_AVAILABLE=true
else
  echo "Warning: ${STATIC_ROOT}/sitemap.xml not found after copy attempt. Debug info:"
  docker exec "${CONTAINER_NAME}" sh -c 'ls -la /app/dist 2>/dev/null; echo ---; ls -la /app/dist/public 2>/dev/null' || true
  echo "Falling back to proxying /sitemap.xml and /robots.txt to Node."
fi

cat > "${NGINX_SITE_PATH}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    return 301 https://${DOMAIN}\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    client_max_body_size 20m;
EOF

if [[ "${STATIC_AVAILABLE}" == "true" ]]; then
cat >> "${NGINX_SITE_PATH}" <<EOF

    root ${STATIC_ROOT};

    location = /sitemap.xml {
        default_type application/xml;
        try_files /sitemap.xml =404;
    }

    location = /robots.txt {
        default_type text/plain;
        try_files /robots.txt =404;
    }
EOF
fi

cat >> "${NGINX_SITE_PATH}" <<EOF

    location / {
        proxy_pass http://${BACKEND_UPSTREAM};
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
systemctl reload nginx

if [[ "${STATIC_AVAILABLE}" == "true" ]]; then
  echo "Nginx config for ${DOMAIN} updated: sitemap.xml/robots.txt served statically from ${STATIC_ROOT}, everything else proxied to ${BACKEND_UPSTREAM}."
else
  echo "Nginx config for ${DOMAIN} updated, but sitemap.xml/robots.txt are still proxied to ${BACKEND_UPSTREAM} (static files not found)."
fi

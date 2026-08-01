#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Fix Nginx for foto-post-weltweit.de (root domain)
# Proxies all frontend routes (incl. /sitemap.xml) to the
# familypost-backend Docker container on 127.0.0.1:3000.
# ============================================

DOMAIN="${DOMAIN:-foto-post-weltweit.de}"
WWW_DOMAIN="${WWW_DOMAIN:-www.foto-post-weltweit.de}"
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-127.0.0.1:3000}"

NGINX_SITE_PATH="/etc/nginx/sites-available/${DOMAIN}"
NGINX_SITE_LINK="/etc/nginx/sites-enabled/${DOMAIN}"

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

echo "Nginx config for ${DOMAIN} updated and reloaded successfully."

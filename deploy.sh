#!/bin/bash
#
# =============================================================
#  Mail Temp Me - Deploy Script
#  Otomatis setup HTTPS untuk Node.js mail temp web
#  Untuk: Ubuntu/Debian + Nginx + Let's Encrypt + PM2
# =============================================================
#
#  Cara pakai:
#    chmod +x deploy.sh
#    sudo ./deploy.sh
#
#  Atau dengan custom domain:
#    sudo ./deploy.sh aniyahapp.my.id
#
# =============================================================

set -e

# ==================== KONFIGURASI ====================
APP_DIR="/root/mail_temp_me"
APP_PORT="${HTTP_PORT:-3000}"
DOMAIN="${1:-aniyahapp.my.id}"
EMAIL="admin@${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-enabled/tempmail"
PM2_APP_NAME="mail_temp_me"
NODE_ENTRY="server.js"

# Warna output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

# Cek root
if [ "$EUID" -ne 0 ]; then
  err "Script harus dijalankan sebagai root! Gunakan: sudo ./deploy.sh"
  exit 1
fi

echo ""
echo "=========================================="
echo "  Mail Temp Me - Deploy"
echo "  Domain: ${DOMAIN}"
echo "  App:    ${APP_DIR}"
echo "=========================================="
echo ""

# ==================== 1. SYSTEM UPDATE & DEPENDENCIES ====================
info "Step 1: Update sistem & install dependencies..."

apt-get update -qq
apt-get install -y -qq curl git build-essential > /dev/null 2>&1

log "Dependencies terinstall"

# ==================== 2. INSTALL NODE.JS ====================
if ! command -v node &> /dev/null; then
  info "Step 2: Install Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  log "Node.js $(node -v) terinstall"
else
  log "Node.js $(node -v) sudah terinstall"
fi

# ==================== 3. INSTALL PM2 ====================
if ! command -v pm2 &> /dev/null; then
  info "Step 3: Install PM2..."
  npm install -g pm2 > /dev/null 2>&1
  log "PM2 terinstall"
else
  log "PM2 sudah terinstall"
fi

# ==================== 4. INSTALL NGINX ====================
if ! command -v nginx &> /dev/null; then
  info "Step 4: Install Nginx..."
  apt-get install -y -qq nginx > /dev/null 2>&1
  log "Nginx terinstall"
else
  log "Nginx sudah terinstall"
fi

# ==================== 5. INSTALL CERTBOT ====================
if ! command -v certbot &> /dev/null; then
  info "Step 5: Install Certbot (Let's Encrypt)..."
  apt-get install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
  log "Certbot terinstall"
else
  log "Certbot sudah terinstall"
fi

# ==================== 6. STOP APP JIKA SEDANG JALAN ====================
info "Step 6: Stop app jika sedang jalan..."

pm2 stop ${PM2_APP_NAME} 2>/dev/null || true
pm2 delete ${PM2_APP_NAME} 2>/dev/null || true
kill $(lsof -t -i:${APP_PORT}) 2>/dev/null || true
sleep 1

log "App di-stop"

# ==================== 7. NGINX CONFIG (HTTP ONLY - untuk certbot) ====================
info "Step 7: Setup Nginx config (HTTP)..."

cat > ${NGINX_CONF} << NGINX_HTTP
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${APP_DIR}/public;
    index index.html;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location /css {}
    location /js {}
    location /img {}
    location = /favicon.ico {}

    access_log /var/log/nginx/tempmail_access.log;
    error_log /var/log/nginx/tempmail_error.log;
}
NGINX_HTTP

# Hapus default site
rm -f /etc/nginx/sites-enabled/default

nginx -t 2>/dev/null && systemctl restart nginx
log "Nginx HTTP config aktif"

# ==================== 8. SSL CERTIFICATE ====================
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [ -f "${CERT_PATH}" ]; then
  log "Step 8: SSL certificate sudah ada untuk ${DOMAIN}"
else
  info "Step 8: Generate SSL certificate dari Let's Encrypt..."
  certbot certonly --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos --email "${EMAIL}" --redirect 2>&1 | tail -3
  log "SSL certificate berhasil dibuat"
fi

# ==================== 9. NGINX CONFIG (HTTPS) ====================
info "Step 9: Update Nginx config ke HTTPS..."

cat > ${NGINX_CONF} << NGINX_HTTPS
# Redirect HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root ${APP_DIR}/public;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
    gzip_vary on;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location /css {}
    location /js {}
    location /img {}
    location = /favicon.ico {}

    access_log /var/log/nginx/tempmail_access.log;
    error_log /var/log/nginx/tempmail_error.log;
}
NGINX_HTTPS

nginx -t 2>/dev/null && systemctl reload nginx
log "Nginx HTTPS config aktif"

# ==================== 10. INSTALL NODE MODULES ====================
info "Step 10: Install Node.js dependencies..."

cd "${APP_DIR}"
if [ ! -d "node_modules" ]; then
  npm install --production > /dev/null 2>&1
  log "node_modules terinstall"
else
  log "node_modules sudah ada"
fi

# ==================== 11. START APP DENGAN PM2 ====================
info "Step 11: Start app dengan PM2..."

pm2 start ${NODE_ENTRY} --name "${PM2_APP_NAME}"
pm2 save > /dev/null 2>&1

# Setup PM2 startup (auto start on boot)
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
pm2 save > /dev/null 2>&1

log "App running: ${PM2_APP_NAME} (port ${APP_PORT})"

# ==================== 12. FIREWALL (UFW) ====================
info "Step 12: Setup firewall..."

if command -v ufw &> /dev/null; then
  ufw allow 22/tcp > /dev/null 2>&1
  ufw allow 80/tcp > /dev/null 2>&1
  ufw allow 443/tcp > /dev/null 2>&1
  ufw allow 25/tcp > /dev/null 2>&1
  ufw --force enable > /dev/null 2>&1
  log "UFW firewall aktif (22, 80, 443, 25)"
else
  warn "UFW tidak terinstall, skip firewall setup"
fi

# ==================== 13. VERIFIKASI ====================
echo ""
echo "=========================================="
echo "  DEPLOYMENT SELESAI!"
echo "=========================================="
echo ""

# Test app
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${APP_PORT}/ 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
  log "App berjalan: http://127.0.0.1:${APP_PORT} (${HTTP_CODE})"
else
  warn "App belum siap, cek: pm2 logs ${PM2_APP_NAME}"
fi

# Test HTTPS
HTTPS_CODE=$(curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1 --resolve "${DOMAIN}:443:127.0.0.1" 2>/dev/null || echo "000")
if [ "${HTTPS_CODE}" = "200" ]; then
  log "HTTPS OK: https://${DOMAIN} (${HTTPS_CODE})"
else
  warn "HTTPS test: ${HTTPS_CODE}"
fi

# SSL expiry
if [ -f "${CERT_PATH}" ]; then
  EXPIRY=$(openssl x509 -enddate -noout -in "${CERT_PATH}" 2>/dev/null | cut -d= -f2)
  log "SSL berlaku sampai: ${EXPIRY}"
fi

echo ""
echo "  URL: https://${DOMAIN}"
echo ""
echo "=========================================="
echo ""

# ==================== CATATAN PENTING ====================
warn "PENTING - Cek Security Group Cloud!"
echo ""
echo "  Pastikan port berikut TERBUKA di Security Group:"
echo "  - 22   (SSH)"
echo "  - 80   (HTTP)"
echo "  - 443  (HTTPS)"
echo "  - 25   (SMTP - untuk menerima email)"
echo ""
echo "  Alibaba Cloud: Console → ECS → Instance → Security Groups → Add Rule"
echo ""
echo "=========================================="
echo ""
echo "  Perintah berguna:"
echo "    pm2 logs ${PM2_APP_NAME}      # Lihat log app"
echo "    pm2 restart ${PM2_APP_NAME}   # Restart app"
echo "    pm2 status                    # Status semua app"
echo "    systemctl reload nginx        # Reload nginx"
echo "    certbot renew --dry-run       # Test auto renew SSL"
echo ""

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
#    sudo ./deploy.sh yourdomain.com
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
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_
#!/bin/bash
# Setup Nginx + SSL untuk email_temp server
# Jalankan sebagai root di VPS

set -e  # Exit on error

DOMAIN1="aniyahapp.my.id"
DOMAIN2="jasacode.my.id"
EMAIL="admin@${DOMAIN1}"

echo "════════════════════════════════════════════"
echo "  Setup Nginx + Let's Encrypt SSL"
echo "════════════════════════════════════════════"
echo ""

# 1. Install Nginx dan Certbot
echo "[1/6] Install Nginx dan Certbot..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

# 2. Stop Nginx sementara
echo ""
echo "[2/6] Stop Nginx sementara..."
systemctl stop nginx

# 3. Generate SSL Certificate untuk domain 1
echo ""
echo "[3/6] Generate SSL untuk ${DOMAIN1}..."
certbot certonly --standalone \
  -d ${DOMAIN1} \
  -d www.${DOMAIN1} \
  --email ${EMAIL} \
  --agree-tos \
  --non-interactive

# 4. Generate SSL Certificate untuk domain 2
echo ""
echo "[4/6] Generate SSL untuk ${DOMAIN2}..."
certbot certonly --standalone \
  -d ${DOMAIN2} \
  -d www.${DOMAIN2} \
  --email ${EMAIL} \
  --agree-tos \
  --non-interactive

# 5. Copy Nginx config
echo ""
echo "[5/6] Setup Nginx config..."
cp nginx.conf /etc/nginx/sites-available/email-temp
ln -sf /etc/nginx/sites-available/email-temp /etc/nginx/sites-enabled/email-temp

# Hapus default config jika ada
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# 6. Start Nginx
echo ""
echo "[6/6] Start Nginx..."
systemctl enable nginx
systemctl start nginx

# Setup auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "════════════════════════════════════════════"
echo "  ✓ SELESAI!"
echo "════════════════════════════════════════════"
echo ""
echo "SSL Certificate tersimpan di:"
echo "  • /etc/letsencrypt/live/${DOMAIN1}/"
echo "  • /etc/letsencrypt/live/${DOMAIN2}/"
echo ""
echo "Nginx config di:"
echo "  • /etc/nginx/sites-available/email-temp"
echo ""
echo "Langkah selanjutnya:"
echo "  1. Update .env: HTTP_PORT=3000"
echo "  2. Jalankan Node.js: node server.js"
echo "  3. Akses: https://${DOMAIN1}"
echo ""
echo "Auto-renewal sudah aktif (cek: systemctl status certbot.timer)"
echo ""

# Setup HTTPS dengan Nginx + Let's Encrypt

Setup ini menggunakan Nginx sebagai reverse proxy yang handle HTTPS, sementara Node.js tetap jalan di HTTP port 3000.

## Cara Setup di VPS (Ubuntu/Debian)

### 1. Upload files ke VPS
```bash
# Upload folder ke VPS
scp -r email_temp root@your-server-ip:/root/
```

### 2. Jalankan script setup
```bash
cd /root/email_temp
chmod +x setup-nginx-ssl.sh
sudo ./setup-nginx-ssl.sh
```

Script akan otomatis:
- ✓ Install Nginx dan Certbot
- ✓ Generate SSL certificate untuk semua domain
- ✓ Setup Nginx config
- ✓ Enable auto-renewal SSL

### 3. Jalankan Node.js server
```bash
# Install dependencies (jika belum)
npm install

# Jalankan server
node server.js
# Atau pakai PM2:
pm2 start server.js --name email-temp
pm2 save
```

### 4. Akses website
- https://aniyahapp.my.id
- https://jasacode.my.id

## Struktur Setup

```
Internet
   ↓
Nginx (Port 80/443) → HTTPS + SSL
   ↓
Node.js (Port 3000) → HTTP lokal
```

## Troubleshooting

### Cek status Nginx
```bash
systemctl status nginx
nginx -t  # test config
```

### Cek status SSL
```bash
certbot certificates
systemctl status certbot.timer  # auto-renewal
```

### Cek logs
```bash
# Nginx logs
tail -f /var/log/nginx/error.log

# Node.js logs (jika pakai PM2)
pm2 logs email-temp
```

### Reload Nginx (setelah edit config)
```bash
nginx -t && systemctl reload nginx
```

## Renew SSL Manual (otomatis via timer)
```bash
certbot renew
systemctl reload nginx
```

# Temporary Email Service - Production Deployment Guide

## 📋 Quick Setup

### 1. Environment Configuration

Edit `.env` file dengan domain dan konfigurasi VPS Anda:

```bash
# Server Configuration
HTTP_PORT=3000
SMTP_PORT=25              # Port 25 untuk production SMTP
NODE_ENV=production

# Domain Configuration
DOMAIN=yourdomain.com     # Ganti dengan domain Anda
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email Settings
MAX_EMAIL_SIZE=10485760   # 10MB
EMAIL_RETENTION_HOURS=24  # Email akan auto-delete setelah 24 jam

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Install Dependencies

```bash
npm install
```

### 3. DNS Configuration

Tambahkan record DNS untuk domain Anda:

```
A Record:
mail.yourdomain.com → IP_VPS_ANDA

MX Record:
yourdomain.com → mail.yourdomain.com (Priority: 10)

TXT Record (SPF):
yourdomain.com → "v=spf1 ip4:IP_VPS_ANDA ~all"
```

### 4. Setup VPS (Ubuntu/Debian)

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone project ke VPS
cd /var/www
git clone your-repo.git temp-mail
cd temp-mail

# Copy environment file
cp .env.example .env
nano .env  # Edit dengan konfigurasi Anda

# Install dependencies
npm install

# Start dengan PM2
pm2 start server.js --name temp-mail
pm2 startup
pm2 save
```

### 5. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Buat konfigurasi
sudo nano /etc/nginx/sites-available/temp-mail
```

Copy konfigurasi ini:

```nginx
server {
    listen 80;
    server_name mail.yourdomain.com yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/temp-mail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Install SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL
sudo certbot --nginx -d mail.yourdomain.com -d yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### 7. Firewall Configuration

```bash
# Allow HTTP, HTTPS, SMTP
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 25/tcp
sudo ufw enable
```

### 8. SMTP Port 25 Setup

Jika port 25 blocked oleh provider, gunakan alternatif:

```bash
# Option 1: Gunakan port 587 atau 2525 di .env
SMTP_PORT=2525

# Option 2: Forward port dengan iptables
sudo iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525
sudo apt install iptables-persistent
```

## 🚀 Deployment Commands

```bash
# Start
pm2 start temp-mail

# Stop
pm2 stop temp-mail

# Restart
pm2 restart temp-mail

# View logs
pm2 logs temp-mail

# Monitor
pm2 monit

# Status
pm2 status
```

## 📊 Monitoring API

```bash
# Check server stats
curl http://localhost:3000/api/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "rss": 50.5,
    "heapTotal": 20.3,
    "heapUsed": 15.2,
    "emailCount": 42,
    "emailBoxCount": 10
  },
  "config": {
    "domain": "yourdomain.com",
    "retentionHours": 24,
    "maxEmailSize": 10485760
  }
}
```

## 🔍 Testing

### Test HTTP API:
```bash
curl http://localhost:3000/api/generate
```

### Test SMTP Server:
```bash
telnet localhost 25
HELO mail.yourdomain.com
MAIL FROM: test@example.com
RCPT TO: random123@yourdomain.com
DATA
Subject: Test Email
From: test@example.com

This is a test email.
.
QUIT
```

### Test dengan Python:
```python
import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Test content')
msg['Subject'] = 'Test Email'
msg['From'] = 'sender@example.com'
msg['To'] = 'random123@yourdomain.com'

with smtplib.SMTP('yourdomain.com', 25) as server:
    server.send_message(msg)
```

## 🛠️ Maintenance

### Auto-cleanup:
- Email otomatis terhapus setelah `EMAIL_RETENTION_HOURS` (default: 24 jam)
- Cleanup berjalan setiap 1 jam sekali
- Tidak perlu database, semua di cache memory

### Update aplikasi:
```bash
cd /var/www/temp-mail
git pull
npm install
pm2 restart temp-mail
```

### Backup logs:
```bash
pm2 flush  # Clear logs
pm2 logs temp-mail --lines 1000 > backup.log
```

## 🔐 Security Checklist

- ✅ Firewall aktif (UFW)
- ✅ SSL/TLS certificate installed
- ✅ CORS configured
- ✅ Email size limit (10MB)
- ✅ Auto-cleanup expired emails
- ✅ Rate limiting (opsional, bisa ditambah)
- ✅ Non-root user untuk PM2

## ⚠️ Important Notes

1. **Email hanya di cache** - Restart server = hilang semua email
2. **TTL 24 jam** - Email auto-delete setelah retention period
3. **No database needed** - Semua di memory (Map)
4. **Port 25** - Mungkin di-block ISP/provider, gunakan port alternatif
5. **Memory usage** - Monitor dengan `pm2 monit`

## 📝 Environment Files

- `.env` - Production config (jangan commit ke git)
- `.env.example` - Template untuk production
- `.env.development` - Development config (port 2525)

## 🆘 Troubleshooting

### SMTP Port 25 blocked:
```bash
# Cek port
sudo netstat -tulpn | grep :25

# Test dari luar
telnet yourdomain.com 25
```

### Email tidak masuk:
```bash
# Check logs
pm2 logs temp-mail --lines 100

# Check SMTP server
sudo netstat -tulpn | grep :25
```

### Memory tinggi:
```bash
# Check stats
curl http://localhost:3000/api/stats

# Restart untuk clear cache
pm2 restart temp-mail
```

---

**Siap Production!** 🚀

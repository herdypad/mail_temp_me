# 📧 Temporary Email Service

Aplikasi web email temporary yang dapat menerima email dari semua pengirim, generate email random, dan mengirim email. Menggunakan Node.js dengan cache memory tanpa database.

## ✨ Fitur Lengkap

### 1. **Generate Email Random** 🎲
- Buat alamat email temporary secara otomatis
- Format: `abc123xyz@yourdomain.com` (10 karakter random)
- Copy email dengan satu klik

### 2. **Email Custom** ✏️
- **Buat email dengan username pilihan sendiri**
- **Buka inbox email yang sudah ada** (seperti "login")
- Format: `username-anda@yourdomain.com`
- Real-time check ketersediaan username
- Validasi: 3-30 karakter (huruf, angka, titik, dash, underscore)

### 3. **Kirim Email** ✉️
- Kirim email dari aplikasi
- Form compose yang user-friendly
- Email langsung masuk ke inbox penerima
- Support antar pengguna di sistem yang sama

### 4. **Menerima Email via SMTP** 📬
- SMTP server yang dapat menerima email dari semua pengirim
- Support email dari service eksternal
- Parse otomatis: subject, body, attachments info

### 5. **Inbox Real-time** 🔄
- Auto-refresh inbox setiap 5 detik
- View email detail lengkap
- Preview pesan di list
- Lihat attachment info (nama, size)

### 6. **Auto-Cleanup** 🗑️
- Email otomatis terhapus setelah 24 jam (configurable)
- Cleanup berjalan setiap 1 jam
- Memory management otomatis
- No database needed - semua di cache

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Development Mode
```bash
npm start
```

Buka browser: **http://localhost:3000**

## 📋 Environment Configuration

Copy `.env.example` ke `.env` dan sesuaikan:

```env
# Server Configuration
HTTP_PORT=3000
SMTP_PORT=2525
NODE_ENV=development

# Domain Configuration
DOMAIN=temp-mail.local
ALLOWED_ORIGINS=*

# Email Settings
MAX_EMAIL_SIZE=10485760      # 10MB
EMAIL_RETENTION_HOURS=24     # TTL email

# Security (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📖 Cara Menggunakan

### 1. Generate Email Random

1. Buka tab **"Random Email"**
2. Klik **"🔄 Generate Email Random"**
3. Email otomatis dibuat: `abc123xyz@yourdomain.com`
4. Klik **"📋 Copy"** untuk menyalin
5. Inbox siap menerima email!

### 2. Buat Email Custom

1. Buka tab **"Email Custom"**
2. Ketik username yang diinginkan (contoh: `john-doe`)
3. Lihat status ketersediaan:
   - ✓ **Email tersedia** - Klik **"✨ Buat Baru"**
   - ✓ **Email ditemukan** - Klik **"🔓 Buka Inbox"**
4. Email siap digunakan!

### 3. Kirim Email

1. Klik **"✉️ Kirim Email"** di bagian Inbox
2. Isi form:
   - **Dari:** Otomatis (email Anda)
   - **Kepada:** Email tujuan
   - **Subject:** Judul email
   - **Pesan:** Isi pesan
3. Klik **"📤 Kirim Email"**
4. Email langsung masuk ke inbox penerima!

### 4. Menerima Email via SMTP

**Test dengan Telnet:**
```bash
telnet localhost 2525
HELO localhost
MAIL FROM: sender@example.com
RCPT TO: abc123xyz@yourdomain.com
DATA
Subject: Test Email
From: sender@example.com

Ini adalah test email.
.
QUIT
```

**Test dengan Python:**
```python
import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Ini adalah test email')
msg['Subject'] = 'Test Subject'
msg['From'] = 'sender@example.com'
msg['To'] = 'abc123xyz@yourdomain.com'

with smtplib.SMTP('localhost', 2525) as server:
    server.send_message(msg)
print('Email terkirim!')
```

**Test dengan Node.js:**
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 2525,
  secure: false
});

await transporter.sendMail({
  from: 'sender@example.com',
  to: 'abc123xyz@yourdomain.com',
  subject: 'Test Email',
  text: 'Ini adalah test email'
});
```

## 🌐 API Documentation

### Generate Random Email
```http
GET /api/generate
```

**Response:**
```json
{
  "success": true,
  "email": "abc123xyz@yourdomain.com",
  "expiresIn": "24 jam",
  "message": "Email temporary berhasil dibuat"
}
```

### Create Custom Email
```http
POST /api/create
Content-Type: application/json

{
  "username": "john-doe"
}
```

**Response:**
```json
{
  "success": true,
  "email": "john-doe@yourdomain.com",
  "expiresIn": "24 jam",
  "message": "Email custom berhasil dibuat"
}
```

### Check Email Availability
```http
GET /api/check/:username
```

**Response:**
```json
{
  "success": true,
  "available": true,
  "email": "john-doe@yourdomain.com",
  "message": "Email tersedia"
}
```

### Get Inbox
```http
GET /api/emails/:emailAddress
```

**Response:**
```json
{
  "success": true,
  "emails": [
    {
      "id": "1234567890abc",
      "from": "sender@example.com",
      "subject": "Test Email",
      "date": "2025-11-24T10:00:00.000Z",
      "preview": "Ini adalah test email..."
    }
  ],
  "count": 1,
  "expiresAt": "2025-11-25T10:00:00.000Z"
}
```

### Get Email Detail
```http
GET /api/email/:id
```

**Response:**
```json
{
  "success": true,
  "email": {
    "id": "1234567890abc",
    "from": "sender@example.com",
    "to": ["recipient@yourdomain.com"],
    "subject": "Test Email",
    "text": "Ini adalah test email",
    "html": "<p>Ini adalah test email</p>",
    "date": "2025-11-24T10:00:00.000Z",
    "attachments": []
  }
}
```

### Send Email
```http
POST /api/send
Content-Type: application/json

{
  "from": "sender@yourdomain.com",
  "to": "recipient@yourdomain.com",
  "subject": "Test Subject",
  "message": "Pesan email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email berhasil dikirim",
  "emailId": "1234567890abc"
}
```

### Get Server Stats
```http
GET /api/stats
```

**Response:**
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

## 📁 Struktur Project

```
email_temp/
├── server.js              # Server utama (Express + SMTP)
├── package.json           # Dependencies
├── .env                   # Environment variables (jangan commit!)
├── .env.example           # Template environment
├── .env.development       # Development config
├── public/
│   ├── index.html        # Web interface
│   ├── style.css         # Styling
│   └── app.js            # Frontend JavaScript
├── README.md             # Dokumentasi utama
└── DEPLOYMENT.md         # Panduan deployment production
```

## 🛠️ Teknologi Stack

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Web framework
- **smtp-server** - SMTP server untuk menerima email
- **mailparser** - Parser email format MIME
- **dotenv** - Environment variables management
- **cors** - Cross-Origin Resource Sharing

### Frontend
- **Vanilla JavaScript** - No framework, pure JS
- **CSS3** - Modern styling dengan gradients
- **Fetch API** - HTTP requests
- **Responsive Design** - Mobile-friendly

### Infrastructure
- **PM2** - Process manager (production)
- **Nginx** - Reverse proxy (production)
- **Certbot** - SSL/TLS certificates (production)

## 🔧 Development

### File Structure
- `server.js` - Main server file dengan semua API endpoints
- `public/index.html` - HTML structure dengan tabs
- `public/style.css` - Styling dengan modern UI
- `public/app.js` - Frontend logic dan API calls

### Adding New Features
1. Update `server.js` untuk API endpoints baru
2. Update `public/index.html` untuk UI components
3. Update `public/style.css` untuk styling
4. Update `public/app.js` untuk frontend logic

### Testing Locally
```bash
# Start server
npm start

# Test SMTP server
telnet localhost 2525

# Test API
curl http://localhost:3000/api/generate
curl http://localhost:3000/api/stats
```

## 🚀 Production Deployment

Lihat **[DEPLOYMENT.md](DEPLOYMENT.md)** untuk panduan lengkap deployment ke VPS.

**Quick Steps:**
1. Setup DNS (A Record, MX Record, SPF)
2. Install Node.js 18+ di VPS
3. Clone project dan setup environment
4. Install Nginx dan SSL certificate
5. Start dengan PM2
6. Configure firewall

**Requirements:**
- Node.js 18+ (untuk `node:buffer` support)
- VPS dengan minimum 512MB RAM
- Domain dengan akses DNS management
- Port 25 atau 2525 untuk SMTP

## 📊 Cache & Memory Management

### Storage Architecture
- **Map-based storage** - No database required
- **In-memory cache** - Fast access, auto-cleanup
- **TTL (Time To Live)** - 24 jam default
- **Auto-cleanup** - Runs every 1 hour

### Memory Stats
Monitor memory usage via API:
```bash
curl http://localhost:3000/api/stats
```

### Cleanup Process
1. Runs every hour automatically
2. Deletes emails older than `EMAIL_RETENTION_HOURS`
3. Deletes empty email boxes
4. Logs cleanup results

## ⚠️ Important Notes

### Development vs Production
- **Development:** Port 2525 (tidak perlu root)
- **Production:** Port 25 (perlu root access)
- **Environment:** Set `NODE_ENV=production` di production

### Email Retention
- Default: 24 jam
- Configurable via `EMAIL_RETENTION_HOURS`
- Email auto-delete setelah expired
- Tidak ada backup - semua di memory

### Security Considerations
- ✅ CORS configured
- ✅ Input validation
- ✅ Email size limit (10MB)
- ✅ Auto-cleanup expired data
- ⚠️ No authentication (by design untuk temp email)
- ⚠️ No encryption (plaintext storage)
- ⚠️ No spam protection

## 🔐 Security Best Practices

### For Production:
1. **Set proper CORS origins** (jangan gunakan `*`)
2. **Enable rate limiting** (tambahkan express-rate-limit)
3. **Setup firewall rules** (UFW/iptables)
4. **Use HTTPS** (SSL certificate wajib)
5. **Monitor server** (PM2 monitoring)
6. **Regular updates** (npm audit, security patches)

### Not Suitable For:
- ❌ Sensitive data
- ❌ Personal information
- ❌ Business critical emails
- ❌ Long-term email storage
- ❌ High-volume email processing

## 🐛 Troubleshooting

### Port 25 Blocked
```bash
# Gunakan port alternatif
SMTP_PORT=2525

# Atau forward dengan iptables
sudo iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525
```

### Node.js Version Error
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # Should be 18+ or 20+
```

### Email Not Received
1. Check SMTP server running: `pm2 logs temp-mail`
2. Check DNS MX record: `nslookup -type=mx yourdomain.com`
3. Test SMTP: `telnet yourdomain.com 25`
4. Check firewall: `sudo ufw status`

### High Memory Usage
```bash
# Check stats
curl http://localhost:3000/api/stats

# Restart to clear cache
pm2 restart temp-mail

# Lower retention time
EMAIL_RETENTION_HOURS=12  # di .env
```

## 📝 License

ISC License

Copyright (c) 2025

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/herdypad/mail_temp_me/issues)
- **Email:** (your-email@example.com)

## 🎯 Roadmap

- [ ] Add rate limiting
- [ ] Add Redis cache support
- [ ] Add email search functionality
- [ ] Add attachment download
- [ ] Add email forwarding
- [ ] Add webhook notifications
- [ ] Add admin dashboard
- [ ] Add API authentication

---

**Built with ❤️ using Node.js**

**Repository:** [github.com/herdypad/mail_temp_me](https://github.com/herdypad/mail_temp_me)
# mail_temp_me

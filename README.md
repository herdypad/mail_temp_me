# 📧 Temporary Email Service

Aplikasi web email temporary yang dapat menerima email dari semua pengirim dan generate email random menggunakan Node.js.

## ✨ Fitur

1. **Generate Email Random** - Buat alamat email temporary secara otomatis
2. **Menerima Email** - SMTP server yang dapat menerima email dari semua pengirim
3. **Inbox Real-time** - Auto-refresh inbox setiap 5 detik
4. **View Email Detail** - Lihat isi email lengkap dengan attachment info
5. **Copy Email** - Copy alamat email dengan satu klik

## 🚀 Cara Install

1. **Install dependencies:**
```bash
npm install
```

2. **Jalankan server:**
```bash
npm start
```

Atau untuk development dengan auto-reload:
```bash
npm run dev
```

## 📝 Cara Menggunakan

1. **Buka browser** dan akses: http://localhost:3000

2. **Generate Email:**
   - Klik tombol "Generate Email Baru"
   - Email random akan dibuat otomatis (contoh: abc123xyz@temp-mail.local)
   - Klik "Copy" untuk menyalin alamat email

3. **Menerima Email:**
   - Gunakan SMTP client (seperti Postfix, Gmail SMTP, atau script) untuk mengirim email
   - Email akan masuk ke inbox secara otomatis
   - Inbox akan refresh setiap 5 detik

4. **Lihat Email:**
   - Klik pada email di inbox untuk melihat detail lengkap
   - Detail termasuk: pengirim, subject, isi pesan, dan info attachment

## 🔧 Konfigurasi

### Port yang Digunakan:
- **HTTP Server:** Port 3000
- **SMTP Server:** Port 2525

### Testing dengan Command Line:

Anda bisa test mengirim email menggunakan telnet:

```bash
telnet localhost 2525
HELO localhost
MAIL FROM: sender@example.com
RCPT TO: [alamat-email-yang-digenerate]@temp-mail.local
DATA
Subject: Test Email
From: sender@example.com
To: [alamat-email-yang-digenerate]@temp-mail.local

Ini adalah test email untuk temporary mail service.
.
QUIT
```

Atau menggunakan Python:

```python
import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Ini adalah test email')
msg['Subject'] = 'Test Subject'
msg['From'] = 'sender@example.com'
msg['To'] = 'abc123xyz@temp-mail.local'

with smtplib.SMTP('localhost', 2525) as server:
    server.send_message(msg)
print('Email terkirim!')
```

## 📁 Struktur Project

```
email_temp/
├── server.js           # Server utama (Express + SMTP)
├── package.json        # Dependencies
├── public/
│   ├── index.html     # Web interface
│   ├── style.css      # Styling
│   └── app.js         # Frontend JavaScript
└── README.md          # Dokumentasi
```

## 🛠️ Teknologi

- **Node.js** - Runtime JavaScript
- **Express** - Web framework
- **smtp-server** - SMTP server untuk menerima email
- **mailparser** - Parser email format
- **Vanilla JavaScript** - Frontend tanpa framework

## ⚠️ Catatan Penting

1. **Ini adalah development server** - Tidak untuk production
2. **Data email disimpan di memory** - Email akan hilang saat server restart
3. **Tidak ada autentikasi** - Semua email diterima tanpa verifikasi
4. **SMTP port 2525** - Bukan port standar (25) untuk keamanan development

## 🔐 Security Notice

Aplikasi ini dibuat untuk **development dan testing** saja. Jangan gunakan untuk:
- Production environment
- Menerima data sensitif
- Email yang memerlukan enkripsi
- Service publik tanpa security layer

## 📝 License

ISC

## 🤝 Contributing

Silakan buat pull request atau issue untuk improvement.

---

**Dibuat dengan ❤️ menggunakan Node.js**
# mail_temp_me

# 🌐 Panduan Menambah Domain Baru

Dokumen ini menjelaskan cara menambahkan domain baru ke layanan temporary email.

## 📋 Daftar Isi
1. [Persiapan Domain](#persiapan-domain)
2. [Konfigurasi DNS](#konfigurasi-dns)
3. [Konfigurasi Aplikasi](#konfigurasi-aplikasi)
4. [Testing & Verifikasi](#testing--verifikasi)

---

## 1. Persiapan Domain

### A. Pastikan Anda Memiliki:
- ✅ Domain yang sudah terdaftar (contoh: `example.com`)
- ✅ Akses ke DNS Management domain
- ✅ IP Public server (contoh: `8.215.48.142`)
- ✅ Port 25 (SMTP) terbuka di firewall server

### B. Domain yang Bisa Digunakan:
- Domain utama: `example.com`
- Subdomain: `mail.example.com` atau `temp.example.com`
- Domain gratis: `.my.id`, `.tk`, `.ml`, dll

---

## 2. Konfigurasi DNS

Masuk ke DNS Management provider domain Anda (Cloudflare, Niagahoster, dll) dan tambahkan record berikut:

### A. MX Record (WAJIB) 📬
Agar domain bisa menerima email:

```
Type: MX
Name: @
Value: mail.example.com
Priority: 10
TTL: 3600
```

**Catatan:**
- `@` artinya domain utama
- `mail.example.com` adalah hostname mail server
- Priority 10 adalah standar (semakin kecil, semakin prioritas)

### B. A Record untuk Mail Server (WAJIB) 🔗

```
Type: A
Name: mail
Value: 8.215.48.142
TTL: 3600
```

**Ganti `8.215.48.142` dengan IP Public server Anda!**

### C. SPF Record (WAJIB untuk deliverability) ✉️

```
Type: TXT
Name: @
Value: v=spf1 ip4:8.215.48.142 -all
TTL: 3600
```

**Fungsi SPF:**
- Mencegah email spoofing
- Meningkatkan deliverability
- Validasi bahwa IP server berhak mengirim email

### D. PTR Record (Opsional, tapi disarankan) 🔄

PTR record (reverse DNS) harus dikonfigurasi di **provider hosting/VPS**, bukan di domain registrar.

**Contoh:** `8.215.48.142` → `mail.example.com`

Hubungi provider hosting untuk setup PTR record.

---

## 3. Konfigurasi Aplikasi

### A. Edit File `.env`

Tambahkan domain baru ke variable `DOMAINS` (pisahkan dengan koma):

```env
# Sebelum (1 domain)
DOMAINS=temp-mail.local

# Sesudah (multiple domains)
DOMAINS=temp-mail.local,example.com,aniyahapp.my.id

# Atau domain saja
DOMAINS=example.com,anotherdomain.com
```

**Contoh lengkap `.env`:**

```env
# Server Configuration
HTTP_PORT=3000
SMTP_PORT=25
NODE_ENV=production

# Domain Configuration (pisahkan dengan koma, tanpa spasi)
DOMAINS=example.com,temp.example.com,aniyahapp.my.id

ALLOWED_ORIGINS=*

# Email Settings
MAX_EMAIL_SIZE=10485760      # 10MB
EMAIL_RETENTION_HOURS=24     # Email hilang otomatis setelah 24 jam

# Security (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### B. Restart Aplikasi

Setelah edit `.env`, restart aplikasi:

```bash
# Jika pakai PM2
pm2 restart email-temp

# Jika manual dengan npm
npm start

# Jika pakai systemd
sudo systemctl restart email-temp
```

---

## 4. Testing & Verifikasi

### A. Cek DNS Propagation (Tunggu 5-60 menit)

#### 1. Test MX Record:
```bash
nslookup -type=MX example.com

# Output yang benar:
# example.com MX preference = 10, mail exchanger = mail.example.com
```

#### 2. Test A Record:
```bash
nslookup mail.example.com

# Output yang benar:
# Name: mail.example.com
# Address: 8.215.48.142
```

#### 3. Test SPF Record:
```bash
nslookup -type=TXT example.com

# Output yang benar:
# example.com text = "v=spf1 ip4:8.215.48.142 -all"
```

### B. Online DNS Checker 🌐

Gunakan tool online untuk verifikasi lengkap:

**MXToolbox (RECOMMENDED):**
```
https://mxtoolbox.com/SuperTool.aspx
```

Masukkan domain Anda dan cek:
- ✅ MX Record
- ✅ SPF Record  
- ✅ Blacklist check
- ✅ SMTP connection

**Alternatif lain:**
- https://dnschecker.org/
- https://www.whatsmydns.net/

### C. Test Kirim Email via Telnet

```bash
telnet 8.215.48.142 25

# Setelah connect, ketik:
HELO test.com
MAIL FROM: <sender@example.com>
RCPT TO: <user@example.com>
DATA
Subject: Test Email Domain Baru

Ini adalah test email untuk domain baru.
.
QUIT
```

**Cara membaca hasil:**
- `220` = Server ready
- `250` = Command OK
- `354` = Start mail input
- `250 2.0.0` = Email accepted

### D. Test via Aplikasi Web

1. Buka aplikasi di browser: `http://IP-SERVER:3000`
2. Buat email custom dengan domain baru: `test@example.com`
3. Kirim email test dari form "Kirim Email"
4. Cek apakah email masuk ke inbox

---

## 🔧 Troubleshooting

### ❌ Email tidak masuk / MX record tidak terbaca

**Solusi:**
1. Tunggu DNS propagation (5-60 menit, bisa sampai 24 jam)
2. Cek MX record dengan `nslookup -type=MX example.com`
3. Pastikan priority MX = 10
4. Clear DNS cache: 
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### ❌ SMTP Port 25 tidak bisa diakses

**Solusi:**
1. Cek firewall server:
   ```bash
   sudo ufw allow 25/tcp
   sudo ufw status
   ```

2. Cek apakah port 25 terbuka:
   ```bash
   sudo netstat -tulpn | grep :25
   ```

3. Beberapa cloud provider (AWS, GCP) block port 25 by default
   - Request unblock port 25 ke support
   - Atau gunakan port alternatif (2525) dan setup relay

### ❌ Email masuk tapi tidak tampil di inbox

**Solusi:**
1. Cek log server untuk error:
   ```bash
   pm2 logs email-temp
   ```

2. Pastikan domain ada di `.env` variable `DOMAINS`
3. Restart aplikasi setelah edit `.env`

### ❌ SPF Check Failed

**Solusi:**
1. Pastikan SPF record format benar: `v=spf1 ip4:IP_SERVER -all`
2. Ganti `IP_SERVER` dengan IP public yang benar
3. Tunggu DNS propagation
4. Verify di https://mxtoolbox.com/spf.aspx

---

## 📝 Checklist Lengkap

Sebelum menganggap domain sudah berhasil ditambahkan, pastikan:

- [ ] Domain sudah terdaftar dan Anda punya akses DNS
- [ ] MX Record sudah dibuat (priority 10)
- [ ] A Record untuk mail server sudah dibuat
- [ ] SPF Record sudah dibuat
- [ ] Domain sudah ditambahkan ke `.env` file
- [ ] Aplikasi sudah di-restart
- [ ] DNS sudah propagate (test dengan nslookup)
- [ ] MX Record verify di MXToolbox
- [ ] Test kirim email berhasil
- [ ] Email masuk ke inbox aplikasi

---

## 💡 Tips Tambahan

### 1. Multiple Domains
Anda bisa menambahkan sebanyak mungkin domain:
```env
DOMAINS=domain1.com,domain2.com,domain3.com,mail.example.com
```

### 2. Subdomain
Lebih baik gunakan subdomain untuk email temporary:
```
mail.example.com
temp.example.com
disposable.example.com
```

### 3. Domain Gratis
Untuk testing, gunakan domain gratis:
- `.my.id` (Indonesia)
- Freenom: `.tk`, `.ml`, `.ga`, `.cf`

### 4. Production Checklist
Jika deploy ke production:
- ✅ Setup PTR record
- ✅ Setup DKIM (optional tapi disarankan)
- ✅ Setup DMARC (optional)
- ✅ Monitor blacklist status
- ✅ Backup konfigurasi DNS

---

## 📞 Bantuan & Support

**Jika masih ada masalah:**
1. Cek error log: `pm2 logs` atau `journalctl -u email-temp`
2. Verify DNS dengan online tools
3. Pastikan firewall dan port sudah benar
4. Review file `.env` untuk typo

**Referensi:**
- DNS Setup Guide: `DNS_SETUP.md`
- Project README: `README.md`
- Deployment Guide: `DEPLOYMENT.md`

---

*Update terakhir: Mei 2026*

# Product Requirements Document (PRD)
## Temporary Email Service

**Versi:** 1.0.0  
**Status:** In Development  
**Tanggal:** Mei 2026

---

## 1. Executive Summary

**Temporary Email Service** adalah aplikasi web yang memungkinkan pengguna untuk membuat alamat email sementara (disposable email) untuk melindungi privasi mereka. Pengguna dapat membuat email random atau custom, menerima email melalui SMTP server, dan mengelola inbox mereka. Aplikasi juga dilengkapi dengan fitur paste sharing untuk berbagi konten secara sementara.

**Target User:** Pengguna yang membutuhkan email sementara untuk registrasi online, verifikasi layanan, atau melindungi privasi mereka.

---

## 2. Goals & Objectives

### Business Goals
- ✅ Menyediakan solusi email sementara yang mudah digunakan
- ✅ Melindungi privasi pengguna dari spam dan tracking
- ✅ Menyediakan alternatif gratis untuk layanan premium serupa
- ✅ Mengurangi beban email pribadi pengguna

### Technical Goals
- ✅ Implementasi SMTP Server untuk penerimaan email real-time
- ✅ Arsitektur lightweight dengan in-memory storage
- ✅ API RESTful yang robust dan scalable
- ✅ UI responsif dan user-friendly
- ✅ Support multiple domains untuk diversifikasi

---

## 3. User Stories & Features

### 3.1 Fitur Core

#### A. Random Email Generation
**User Story:** Sebagai pengguna, saya ingin membuat email random dengan satu klik untuk melindungi privasi saya.
data username di ambil dari get https://randomuser.me/api/
dan datanya ambil dari [results][login][username]

**Acceptance Criteria:**
- Generate email otomatis dengan format: `[10 karakter random]@[domain pilihan]`
- **Dropdown selector** untuk memilih domain dari daftar yang tersedia
- Email langsung dapat digunakan untuk menerima pesan
- Copy button untuk menyalin email ke clipboard
- Display jangka waktu kedaluwarsa (default 24 jam)

**API:** `GET /api/generate`

```
Response:
{
  "success": true,
  "email": "abcd1234ef@temp-mail.local",
  "expiresIn": "24 jam",
  "message": "Email temporary berhasil dibuat"
}
```

---

#### B. Custom Email Creation
**User Story:** Sebagai pengguna, saya ingin membuat email dengan username pilihan saya agar mudah diingat, dan memilih domain dari daftar yang tersedia.

**Acceptance Criteria:**
- Input username custom (3-30 karakter)
- **Dropdown selector** untuk memilih domain dari daftar tersedia (bukan ketik manual)
- Validasi format: hanya alphanumeric, titik, dash, underscore untuk username
- Cek ketersediaan email secara real-time saat pengguna mengetik username
- Pesan error yang jelas jika email sudah digunakan
- Email dapat dipilih dari domain apapun (dikonfigurasi di server)

**API:** `POST /api/create`

```
Request:
{
  "username": "myemail",
  "domain": "temp-mail.local"
}

Response:
{
  "success": true,
  "email": "myemail@temp-mail.local",
  "expiresIn": "24 jam",
  "message": "Email custom berhasil dibuat"
}
```

**Validasi Username:**
- Minimal 3 karakter, maksimal 30 karakter
- Hanya huruf (a-z, A-Z), angka (0-9), titik (.), dash (-), underscore (_)
- Case-insensitive

---

#### C. Email Inbox Management
**User Story:** Sebagai pengguna, saya ingin melihat semua email yang diterima di inbox saya secara real-time.

**Acceptance Criteria:**
- Tampilkan daftar email dengan: From, Subject, Preview (100 karakter), Tanggal
- Auto-refresh setiap beberapa detik (polling)
- Loading indicator selama fetch data
- Menampilkan jumlah email terbaru
- Notifikasi audio saat email baru masuk
- Waktu kedaluwarsa inbox
- Tombol refresh manual

**API:** `GET /api/emails/{emailAddress}`

```
Response:
{
  "success": true,
  "emails": [
    {
      "id": "1234567890abc",
      "from": "sender@example.com",
      "subject": "Verifikasi Email",
      "date": "2026-05-05T10:30:00Z",
      "preview": "Klik link di bawah untuk memverifikasi akun Anda..."
    }
  ],
  "count": 1,
  "expiresAt": "2026-05-06T10:00:00Z"
}
```

---

#### D. Email Detail View
**User Story:** Sebagai pengguna, saya ingin membaca konten lengkap dari email yang diterima, termasuk attachment info.

**Acceptance Criteria:**
- Tampilkan full email: From, To, Subject, Body (text & HTML)
- Render HTML email dengan aman
- Tampilkan list attachment (filename, type, size)
- Modal/detail view yang bisa di-close
- Informasi tanggal dan waktu diterima
- Tombol kembali ke inbox

**API:** `GET /api/email/{id}`

```
Response:
{
  "success": true,
  "email": {
    "id": "1234567890abc",
    "from": "sender@example.com",
    "to": ["user@temp-mail.local"],
    "subject": "Verifikasi Email",
    "text": "Konten text email...",
    "html": "<h1>Konten HTML</h1>...",
    "date": "2026-05-05T10:30:00Z",
    "attachments": [
      {
        "filename": "document.pdf",
        "contentType": "application/pdf",
        "size": 102400
      }
    ]
  }
}
```

---

#### E. Email Composition & Sending
**User Story:** Sebagai pengguna, saya ingin mengirim email dari alamat temporary saya untuk testing atau komunikasi.

**Acceptance Criteria:**
- Modal form dengan fields: From, To, Subject, Message
- From field pre-filled dengan email aktif
- Support plain text dan HTML
- Validasi email format
- Validasi field yang required
- Success/error message setelah pengiriman
- Email disimpan di inbox recipient jika ada

**API:** `POST /api/send`

```
Request:
{
  "from": "user@temp-mail.local",
  "to": "recipient@example.com",
  "subject": "Test Email",
  "message": "Ini adalah test email",
  "html": "<p>Ini adalah test email</p>"
}

Response:
{
  "success": true,
  "message": "Email berhasil dikirim",
  "emailId": "1234567890abc"
}
```

**Validasi:**
- From dan To harus valid email format
- Subject dan Message harus tidak kosong
- Max email size: 10MB (configurable)

---

#### F. Paste Sharing Service
**User Story:** Sebagai pengguna, saya ingin membuat paste sementara untuk berbagi kode, teks, atau konten lainnya.

**Acceptance Criteria:**
- Form input dengan title (optional) dan content (required)
- Generate unique paste ID
- Auto-expire sesuai retention period
- Shareable link: `/paste?id={pasteId}`
- Copy link button
- View paste dengan syntax highlighting (optional)
- Delete expired pastes otomatis

**API:**
- `POST /api/paste/create` - Buat paste baru
- `GET /api/paste/{id}` - View paste

```
POST Request:
{
  "title": "My Code Snippet",
  "content": "function hello() { ... }"
}

POST Response:
{
  "success": true,
  "id": "a1b2c3d4e5",
  "expiresIn": "24 hours",
  "message": "Paste created successfully"
}

GET Response:
{
  "success": true,
  "paste": {
    "id": "a1b2c3d4e5",
    "title": "My Code Snippet",
    "content": "function hello() { ... }",
    "createdAt": "2026-05-05T10:30:00Z",
    "expiresAt": "2026-05-06T10:30:00Z"
  }
}
```

---

#### G. Email Availability Check
**User Story:** Sebagai pengguna, saya ingin mengecek apakah email custom yang saya inginkan masih tersedia.

**Acceptance Criteria:**
- Real-time availability check saat mengetik username
- Visual indicator: available/taken
- Helpful message untuk username yang tidak valid
- Tombol "Create" dan "Access" aktif sesuai status

**API:** `GET /api/check/{username}/{domain}`

```
Response:
{
  "success": true,
  "available": true,
  "email": "myemail@temp-mail.local",
  "message": "Email tersedia"
}
```

---

### 3.2 Fitur Supporting

#### H. SMTP Server
**Technical Requirement:** Implementasi SMTP server untuk menerima email dari external mail servers.

**Specifications:**
- Port: 2525 (default, configurable)
- Auth: Optional (disabledCommands: AUTH)
- Banner: Dynamic dari daftar domains
- Max email size: 10MB (configurable)
- Auto-parse email menggunakan mailparser
- Extract: from, to, subject, text, html, attachments
- Simpan ke inbox recipient secara otomatis
- Logging detail untuk setiap email masuk

**Error Handling:**
- Invalid email format → reject
- Max size exceeded → reject
- Parse error → log dan notify

---

#### I. Email Auto-Expiration (TTL)
**Technical Requirement:** Implementasi Time-To-Live untuk email dan inbox.

**Specifications:**
- Default retention: 24 jam (configurable via EMAIL_RETENTION_HOURS)
- Cleanup job: Setiap 1 jam
- Delete email boxes yang expired
- Delete individual emails yang expired
- Delete pastes yang expired
- Log cleanup statistics

**Cleanup Logic:**
```
if (now - timestamp > retentionMs) {
  delete email/inbox/paste
}
```

---

#### J. Memory Management & Stats
**User Story:** Sebagai admin, saya ingin monitor penggunaan resource aplikasi.

**Acceptance Criteria:**
- Track memory usage (RSS, Heap)
- Count email, boxes, pastes aktif
- API untuk get stats
- Display memory info di dashboard (optional)

**API:** `GET /api/stats`

```
Response:
{
  "success": true,
  "stats": {
    "rss": 45.23,           // MB
    "heapTotal": 32.45,     // MB
    "heapUsed": 18.92,      // MB
    "emailCount": 150,
    "emailBoxCount": 45,
    "pasteCount": 12
  },
  "config": {
    "domains": ["temp-mail.local"],
    "retentionHours": 24,
    "maxEmailSize": 10485760
  }
}
```

---

#### K. Inbox Deletion
**User Story:** Sebagai pengguna, saya ingin menghapus semua email di inbox saya.

**Acceptance Criteria:**
- Tombol delete all di inbox
- Confirmation dialog
- Delete semua email untuk email address tersebut
- Success message

**API:** `DELETE /api/emails/{emailAddress}`

```
Response:
{
  "success": true,
  "message": "Semua email berhasil dihapus"
}
```

---

#### L. Notification System
**User Story:** Sebagai pengguna, saya ingin mendapat notifikasi saat email baru tiba.

**Acceptance Criteria:**
- Audio notification (2 beep singkat)
- Visual notification (optional)
- Real-time update menggunakan polling
- Can disable sound dari settings

**Audio Spec:**
- Beep 1: 800 Hz, 0.1s
- Delay: 150ms
- Beep 2: 1000 Hz, 0.1s
- Gain: 0.3

---

#### M. LocalStorage Caching
**Technical Requirement:** Cache email locally untuk performa dan offline support.

**Specifications:**
- Store key: `inbox_{username}`
- Sync dengan server saat ada update
- Prevent duplicate emails
- Auto-load dari cache saat page load

---

## 4. User Interface

### 4.1 Pages

#### 1. Home Page (`/`)
**Components:**
- Header dengan branding
- Tab Navigation:
  - Random Email
  - Custom Email
- Random Email Tab:
  - Domain selector dropdown (untuk pilih domain)
  - Display current email (read-only input)
  - Copy button
  - Generate button
  - Info text
- Custom Email Tab:
  - Username input field
  - Domain selector dropdown
  - Availability message (dynamic, real-time)
  - Create button
  - Access button (untuk buka inbox existing)
  - Info text
- Inbox Section:
  - Email count badge
  - Compose button
  - Email list dengan loading state
  - Empty state message
  - Refresh button
  - Inbox expiration timer

#### 2. Mail/Inbox Page (`/mail/{username}`)
**Components:**
- Header dengan email address
- Action buttons:
  - Copy email
  - Refresh inbox
  - Compose email
  - Clear cache
- Email list:
  - From
  - Subject
  - Preview
  - Received date
  - Click untuk view detail
- Email detail modal:
  - Full email content
  - From, To, Subject, Date
  - Text dan HTML body
  - Attachments list
  - Close button

#### 3. Paste Page (`/paste`)
**Components:**
- Paste create form:
  - Title input
  - Content textarea
  - Create button
- Paste view:
  - Title
  - Content
  - Created date
  - Expiration
  - Copy link button
  - Delete button (optional)

---

## 5. Technical Architecture

### 5.1 Tech Stack
- **Backend:** Node.js + Express.js
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **SMTP:** smtp-server + mailparser
- **Storage:** In-memory (Map)
- **CORS:** Express CORS middleware
- **Environment:** dotenv

### 5.2 Project Structure
```
/
├── server.js              # Main server & API
├── package.json           # Dependencies
├── .env                   # Config
├── public/
│   ├── index.html         # Home page
│   ├── mail.html          # Inbox page
│   ├── paste.html         # Paste page
│   ├── app.js             # Home page logic
│   ├── mail.js            # Inbox page logic
│   ├── paste.js           # Paste page logic
│   └── style.css          # Styling
└── md/
    └── PRD.md             # This file
```

### 5.3 Data Models

#### Email Object
```javascript
{
  id: string,
  from: string,
  to: array[string],
  subject: string,
  text: string,
  html: string,
  date: Date,
  attachments: array[{
    filename: string,
    contentType: string,
    size: number
  }]
}
```

#### EmailBox Object
```javascript
{
  emails: array[{
    id: string,
    from: string,
    subject: string,
    date: Date,
    preview: string
  }],
  timestamp: number
}
```

#### Paste Object
```javascript
{
  id: string,
  title: string,
  content: string,
  createdAt: Date,
  timestamp: number
}
```

---

## 6. API Reference

### Base URL
```
http://localhost:3000/api
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/domains` | Get available domains |
| GET | `/generate` | Generate random email |
| POST | `/create` | Create custom email |
| GET | `/check/{username}/{domain}` | Check email availability |
| GET | `/emails/{emailAddress}` | Get inbox |
| GET | `/email/{id}` | Get email detail |
| DELETE | `/emails/{emailAddress}` | Delete inbox |
| POST | `/send` | Send email |
| POST | `/paste/create` | Create paste |
| GET | `/paste/{id}` | Get paste |
| GET | `/stats` | Get server stats |

#### Endpoint Details

**GET /api/domains** - Get list of available domains
```
Response:
{
  "success": true,
  "domains": ["temp-mail.local", "mail.local"],
  "message": "List of available domains"
}
```

---

## 7. Configuration

### Environment Variables (`.env`)
```env
# Server Ports
HTTP_PORT=3000
SMTP_PORT=2525

# Domains
DOMAINS=temp-mail.local,mail.local

# Email Settings
EMAIL_RETENTION_HOURS=24
MAX_EMAIL_SIZE=10485760

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Default Values
- HTTP_PORT: 3000
- SMTP_PORT: 2525
- DOMAINS: ['temp-mail.local']
- EMAIL_RETENTION_HOURS: 24
- MAX_EMAIL_SIZE: 10MB
- ALLOWED_ORIGINS: '*'

### Multiple Domains Configuration

**Cara mengubah domains yang tersedia:**

1. **Edit file `.env`:**
   ```env
   DOMAINS=domain1.com,domain2.com,domain3.com
   ```

2. **Format:**
   - Pisahkan domain dengan tanda koma (`,`)
   - Tidak ada spasi setelah koma (jika ada, akan di-trim otomatis)
   - Minimal 1 domain, maksimal unlimited

3. **Contoh konfigurasi:**
   ```env
   # Single domain
   DOMAINS=temp-mail.com
   
   # Multiple domains
   DOMAINS=temp-mail.com,tempmail.net,email.local
   
   # Production example
   DOMAINS=mail.example.com,temp.example.com,dev.example.com
   ```

4. **Efek perubahan:**
   - Domain akan langsung tersedia di dropdown selector di UI
   - Random email generation akan random dari semua domain
   - SMTP banner akan menampilkan semua domain

5. **Best Practice:**
   - Pastikan DNS/SMTP routing sudah dikonfigurasi untuk semua domain
   - Gunakan domain yang mudah diingat untuk user experience yang lebih baik

---

## 8. Security & Privacy

### Security Considerations
1. **Email Validation:**
   - Regex validation untuk format email
   - Username length & character restrictions
   - Domain whitelist

2. **Input Sanitization:**
   - Trim whitespace
   - Lowercase email addresses
   - Validate email size

3. **CORS Protection:**
   - Configurable allowed origins
   - Default: allow all (*)

4. **Rate Limiting:**
   - TODO: Implement rate limiting untuk prevent abuse
   - Per IP atau per email address

### Privacy
1. **Data Retention:**
   - Auto-delete email setelah 24 jam
   - No email stored permanently
   - User tidak perlu login/account

2. **No Tracking:**
   - No cookies tracking
   - No analytics (optional untuk future)
   - LocalStorage hanya lokal

---

## 9. Performance & Scalability

### Current Implementation
- **Storage:** In-memory (Map)
- **Limitation:** Single process only
- **Max concurrent:** Depends on Node.js heap

### Future Improvements (Phase 2)
- Migrate to persistent storage (MongoDB, PostgreSQL)
- Implement Redis untuk session & caching
- Load balancing untuk multiple instances
- CDN untuk static assets
- Email queue system

---

## 10. Error Handling

### HTTP Status Codes
- `200 OK` - Successful request
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `409 Conflict` - Email already exists
- `500 Internal Error` - Server error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description"
}
```

### Common Errors
1. **Invalid Username:**
   - Status: 400
   - Message: "Username harus 3-30 karakter, hanya huruf, angka, titik, dash, atau underscore"

2. **Email Already Taken:**
   - Status: 409
   - Message: "Email sudah digunakan, pilih username lain"

3. **Email Not Found:**
   - Status: 404
   - Message: "Email tidak ditemukan atau sudah expired"

4. **Required Field Missing:**
   - Status: 400
   - Message: "From, To, Subject, dan Message harus diisi"

---

## 11. Testing Requirements

### Unit Testing
- [ ] Email generation randomness
- [ ] Email availability check logic
- [ ] Username validation
- [ ] TTL expiration
- [ ] Email parsing dari SMTP

### Integration Testing
- [ ] End-to-end email receiving
- [ ] Email composition & sending
- [ ] Paste CRUD operations
- [ ] Inbox management
- [ ] Cleanup job execution

### Load Testing
- [ ] Max concurrent emails
- [ ] Memory usage under load
- [ ] Response time degradation
- [ ] SMTP server stress

---

## 12. Deployment

### Prerequisites
- Node.js v14+
- npm/yarn
- Port 3000 & 2525 available

### Installation
```bash
npm install
```

### Running
```bash
# Development
npm run dev

# Production
npm start
```

### Docker (Optional - Future)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 2525
CMD ["npm", "start"]
```

---

## 13. Monitoring & Logging

### Server Logs
- Email received: from, to, subject, date
- Email sent: from, to, subject
- Cleanup execution: count of deleted items
- SMTP errors: detailed error logs
- HTTP requests: optional middleware

### Metrics to Track (Future)
- Emails generated per day
- Emails received per day
- Unique users per day
- Server uptime
- API response times

---

## 14. Known Limitations & Constraints

1. **In-Memory Storage:**
   - Data lost on server restart
   - Single process only
   - Limited by available RAM

2. **No Authentication:**
   - Anyone can access/delete inbox
   - Security by obscurity (random URLs)

3. **No Attachment Download:**
   - Attachment info shown but no download
   - Future feature

4. **Limited Email Parsing:**
   - Basic HTML support
   - No CSS sanitization
   - Risk of malicious HTML

5. **No Email Forwarding:**
   - Emails hanya di inbox temporary
   - Tidak bisa forward ke email real

---

## 15. Future Roadmap (Phase 2+)

### Short Term (3-6 months)
- [ ] Rate limiting
- [ ] Email attachment download
- [ ] Custom retention period per email
- [ ] Email search functionality
- [ ] Dark mode UI
- [ ] Mobile app
- [ ] Email export (ZIP/PDF)

### Medium Term (6-12 months)
- [ ] Persistent storage (MongoDB)
- [ ] User accounts & login
- [ ] Email tagging/labels
- [ ] API key authentication
- [ ] Webhook notifications
- [ ] Email templates
- [ ] Analytics dashboard

### Long Term (12+ months)
- [ ] Advanced filtering & rules
- [ ] Email scheduling
- [ ] Integration dengan 3rd party services
- [ ] Email encryption
- [ ] Custom domain support
- [ ] Enterprise plan

---

## 16. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1.0 | May 2026 | Dev Team | Added multiple domains support with UI dropdown selector for both Random and Custom email creation |
| 1.0.0 | May 2026 | Dev Team | Initial PRD from existing codebase |

---

## 17. Approvals

- [ ] Product Manager
- [ ] Engineering Lead
- [ ] Design Lead
- [ ] Security Team

---

**End of Document**

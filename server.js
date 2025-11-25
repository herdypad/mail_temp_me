require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const path = require('path');
const fs = require('fs');

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const SMTP_PORT = process.env.SMTP_PORT || 2525;
const DOMAIN = process.env.DOMAIN || 'temp-mail.local';
const EMAIL_RETENTION_HOURS = parseInt(process.env.EMAIL_RETENTION_HOURS) || 24;
const MAX_EMAIL_SIZE = parseInt(process.env.MAX_EMAIL_SIZE) || 10485760;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
  origin: allowedOrigins[0] === '*' ? '*' : allowedOrigins
}));
app.use(express.json());
app.use(express.static('public'));

// Storage untuk email dengan TTL (Time To Live)
const emails = new Map(); // { id: { data, timestamp } }
const emailBoxes = new Map(); // { email: { emails: [], timestamp } }

// Storage untuk paste dengan TTL
const pastes = new Map(); // { id: { title, content, createdAt, timestamp } }

// Generate random email
function generateRandomEmail() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let username = '';
  for (let i = 0; i < 10; i++) {
    username += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${username}@${DOMAIN}`;
}

// Validate email username format
function isValidUsername(username) {
  // Only allow alphanumeric, dot, hyphen, underscore
  const regex = /^[a-zA-Z0-9._-]{3,30}$/;
  return regex.test(username);
}

// Check if email is available
function isEmailAvailable(email) {
  return !emailBoxes.has(email.toLowerCase());
}

// Cleanup expired emails (auto-delete setelah retention period)
function cleanupExpiredEmails() {
  const now = Date.now();
  const retentionMs = EMAIL_RETENTION_HOURS * 60 * 60 * 1000;
  
  // Cleanup email boxes
  for (const [email, data] of emailBoxes.entries()) {
    if (now - data.timestamp > retentionMs) {
      emailBoxes.delete(email);
      console.log(`Deleted expired email box: ${email}`);
    }
  }
  
  // Cleanup individual emails
  for (const [id, data] of emails.entries()) {
    if (now - data.timestamp > retentionMs) {
      emails.delete(id);
    }
  }
  
  // Cleanup pastes
  for (const [id, data] of pastes.entries()) {
    if (now - data.timestamp > retentionMs) {
      pastes.delete(id);
      console.log(`Deleted expired paste: ${id}`);
    }
  }
  
  console.log(`Cleanup completed. Active emails: ${emails.size}, Active boxes: ${emailBoxes.size}, Active pastes: ${pastes.size}`);
}

// Run cleanup every hour
setInterval(cleanupExpiredEmails, 60 * 60 * 1000);

// Get memory usage
function getMemoryStats() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    emailCount: emails.size,
    emailBoxCount: emailBoxes.size,
    pasteCount: pastes.size
  };
}

// API Routes
app.get('/api/generate', (req, res) => {
  const email = generateRandomEmail();
  emailBoxes.set(email, {
    emails: [],
    timestamp: Date.now()
  });
  res.json({ 
    success: true, 
    email: email,
    expiresIn: `${EMAIL_RETENTION_HOURS} jam`,
    message: 'Email temporary berhasil dibuat'
  });
});

// Create email with custom username
app.post('/api/create', express.json(), (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'Username harus diisi'
    });
  }
  
  if (!isValidUsername(username)) {
    return res.status(400).json({
      success: false,
      message: 'Username harus 3-30 karakter, hanya huruf, angka, titik, dash, atau underscore'
    });
  }
  
  const email = `${username.toLowerCase()}@${DOMAIN}`;
  
  if (!isEmailAvailable(email)) {
    return res.status(409).json({
      success: false,
      message: 'Email sudah digunakan, pilih username lain'
    });
  }
  
  emailBoxes.set(email, {
    emails: [],
    timestamp: Date.now()
  });
  
  res.json({
    success: true,
    email: email,
    expiresIn: `${EMAIL_RETENTION_HOURS} jam`,
    message: 'Email custom berhasil dibuat'
  });
});

// Check email availability
app.get('/api/check/:username', (req, res) => {
  const username = req.params.username;
  
  if (!isValidUsername(username)) {
    return res.json({
      success: false,
      available: false,
      message: 'Format username tidak valid'
    });
  }
  
  const email = `${username.toLowerCase()}@${DOMAIN}`;
  const available = isEmailAvailable(email);
  
  res.json({
    success: true,
    available: available,
    email: email,
    message: available ? 'Email tersedia' : 'Email sudah digunakan'
  });
});

// Get server stats
app.get('/api/stats', (req, res) => {
  const stats = getMemoryStats();
  res.json({
    success: true,
    stats: stats,
    config: {
      domain: DOMAIN,
      retentionHours: EMAIL_RETENTION_HOURS,
      maxEmailSize: MAX_EMAIL_SIZE
    }
  });
});

app.get('/api/emails/:emailAddress', (req, res) => {
  const emailAddress = req.params.emailAddress.toLowerCase();
  const box = emailBoxes.get(emailAddress);
  const inbox = box ? box.emails : [];
  // Log ke terminal
  console.log(`[API] Cek inbox: ${emailAddress} | Jumlah email: ${inbox.length}`);
  res.json({ 
    success: true, 
    emails: inbox,
    count: inbox.length,
    expiresAt: box ? new Date(box.timestamp + EMAIL_RETENTION_HOURS * 60 * 60 * 1000) : null
  });
});

app.get('/api/email/:id', (req, res) => {
  const emailId = req.params.id;
  const emailData = emails.get(emailId);
  
  if (emailData) {
    res.json({ 
      success: true, 
      email: emailData.data 
    });
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'Email tidak ditemukan atau sudah expired' 
    });
  }
});

app.delete('/api/emails/:emailAddress', (req, res) => {
  const emailAddress = req.params.emailAddress.toLowerCase();
  emailBoxes.delete(emailAddress);
  res.json({ 
    success: true, 
    message: 'Semua email berhasil dihapus' 
  });
});

// Paste API endpoints
app.post('/api/paste/create', express.json(), (req, res) => {
  const { title, content } = req.body;
  
  if (!content || content.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Content is required'
    });
  }
  
  // Generate paste ID
  const pasteId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  
  // Save paste
  const pasteData = {
    id: pasteId,
    title: title || 'Untitled',
    content: content,
    createdAt: new Date(),
    timestamp: Date.now()
  };
  
  pastes.set(pasteId, pasteData);
  
  console.log(`Paste created: ${pasteId} - ${pasteData.title}`);
  
  res.json({
    success: true,
    id: pasteId,
    expiresIn: `${EMAIL_RETENTION_HOURS} hours`,
    message: 'Paste created successfully'
  });
});

app.get('/api/paste/:id', (req, res) => {
  const pasteId = req.params.id;
  const paste = pastes.get(pasteId);
  
  if (paste) {
    res.json({
      success: true,
      paste: {
        id: paste.id,
        title: paste.title,
        content: paste.content,
        createdAt: paste.createdAt,
        expiresAt: new Date(paste.timestamp + EMAIL_RETENTION_HOURS * 60 * 60 * 1000)
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Paste not found or expired'
    });
  }
});

// Serve paste page
app.get('/paste', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'paste.html'));
});

// Serve mail inbox page by username
app.get('/mail/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mail.html'));
});

// Send email
app.post('/api/send', express.json(), async (req, res) => {
  const { from, to, subject, message, html } = req.body;
  
  // Validasi
  if (!from || !to || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'From, To, Subject, dan Message harus diisi'
    });
  }
  
  // Validasi email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(from) || !emailRegex.test(to)) {
    return res.status(400).json({
      success: false,
      message: 'Format email tidak valid'
    });
  }
  
  try {
    // Buat email object
    const emailId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const emailData = {
      id: emailId,
      from: from,
      to: [to.toLowerCase()],
      subject: subject,
      text: message,
      html: html || message.replace(/\n/g, '<br>'),
      date: new Date(),
      attachments: []
    };
    
    // Simpan email
    emails.set(emailId, {
      data: emailData,
      timestamp: Date.now()
    });
    
    // Tambahkan ke inbox recipient
    const recipient = to.toLowerCase();
    if (!emailBoxes.has(recipient)) {
      emailBoxes.set(recipient, {
        emails: [],
        timestamp: Date.now()
      });
    }
    
    emailBoxes.get(recipient).emails.push({
      id: emailId,
      from: from,
      subject: subject,
      date: new Date(),
      preview: message.substring(0, 100)
    });
    
    console.log(`Email sent from ${from} to ${to}`);
    console.log(`Subject: ${subject}`);
    
    res.json({
      success: true,
      message: 'Email berhasil dikirim',
      emailId: emailId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim email'
    });
  }
});

// SMTP Server untuk menerima email
const smtpServer = new SMTPServer({
  authOptional: true,
  disabledCommands: ['AUTH'],
  banner: `${DOMAIN} Temporary Email Server`,
  size: MAX_EMAIL_SIZE,
  onData(stream, session, callback) {
    simpleParser(stream, async (err, parsed) => {
      if (err) {
        console.error('Error parsing email:', err);
        return callback(err);
      }

      // Ambil recipient email
      const recipients = session.envelope.rcptTo.map(addr => addr.address.toLowerCase());
      
      // Buat email object
      const emailId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const emailData = {
        id: emailId,
        from: (parsed.from && parsed.from.text) || session.envelope.mailFrom.address,
        to: recipients,
        subject: parsed.subject || '(No Subject)',
        text: parsed.text || '',
        html: parsed.html || '',
        date: parsed.date || new Date(),
        attachments: parsed.attachments ? parsed.attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size
        })) : []
      };

      // Simpan email dengan timestamp
      emails.set(emailId, {
        data: emailData,
        timestamp: Date.now()
      });

      // Tambahkan ke inbox setiap recipient
      recipients.forEach(recipient => {
        if (!emailBoxes.has(recipient)) {
          emailBoxes.set(recipient, {
            emails: [],
            timestamp: Date.now()
          });
        }
        emailBoxes.get(recipient).emails.push({
          id: emailId,
          from: emailData.from,
          subject: emailData.subject,
          date: emailData.date,
          preview: emailData.text.substring(0, 100)
        });
        // Log detail email masuk
        console.log(`[INBOX] Email masuk ke: ${recipient}`);
        console.log(`        Dari: ${emailData.from}`);
        console.log(`        Subject: ${emailData.subject}`);
        console.log(`        Preview: ${emailData.text ? emailData.text.substring(0, 100) : ''}`);
        console.log(`        Tanggal: ${emailData.date}`);
      });

      console.log(`Email diterima untuk: ${recipients.join(', ')}`);
      console.log(`Subject: ${emailData.subject}`);
      
      callback();
    });
  },
  onError(err) {
    console.error('SMTP Error:', err);
  }
});

// Start servers
app.listen(HTTP_PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log('✓ HTTP Server berjalan di http://localhost:' + HTTP_PORT);
  console.log('✓ SMTP Server berjalan di port ' + SMTP_PORT);
  console.log('✓ Domain: ' + DOMAIN);
  console.log('✓ Email retention: ' + EMAIL_RETENTION_HOURS + ' jam');
  console.log('✓ Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('═══════════════════════════════════════════════');
});

smtpServer.listen(SMTP_PORT, '0.0.0.0', () => {
  console.log('✓ SMTP Server siap menerima email');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  smtpServer.close();
  process.exit(0);
});

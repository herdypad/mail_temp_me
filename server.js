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

// Generate random email
function generateRandomEmail() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let username = '';
  for (let i = 0; i < 10; i++) {
    username += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${username}@${DOMAIN}`;
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
  
  console.log(`Cleanup completed. Active emails: ${emails.size}, Active boxes: ${emailBoxes.size}`);
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
    emailBoxCount: emailBoxes.size
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

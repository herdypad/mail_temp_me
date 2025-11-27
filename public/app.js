// Auto-redirect ke domain production jika localhost di production
if (window.location.hostname === 'localhost' && window.location.port === '3000') {
    // Check if this is production by calling stats API
    fetch('/api/stats')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.config.domain && data.config.domain !== 'temp-mail.local') {
                // Redirect to production domain
                const protocol = window.location.protocol;
                window.location.href = `${protocol}//${data.config.domain}`;
            }
        })
        .catch(() => {});
}

const API_URL = window.location.origin + '/api';
let currentEmail = null;
let refreshInterval = null;
let checkTimeout = null;
let isLoading = false;

// Elements
const generateBtn = document.getElementById('generateBtn');
const createBtn = document.getElementById('createBtn');
const accessBtn = document.getElementById('accessBtn');
const copyBtn = document.getElementById('copyBtn');
const composeBtn = document.getElementById('composeBtn');
const refreshBtn = document.getElementById('refreshBtn');
const currentEmailInput = document.getElementById('currentEmail');
const customUsernameInput = document.getElementById('customUsername');
const domainSelect = document.getElementById('domainSelect');
const availabilityMessage = document.getElementById('availabilityMessage');
const emailList = document.getElementById('emailList');
const emailCount = document.getElementById('emailCount');
const loadingIndicator = document.getElementById('loadingIndicator');
const modal = document.getElementById('emailModal');
const closeModal = document.querySelector('.close');
const emailDetail = document.getElementById('emailDetail');

// Loading state functions
function showLoading() {
    isLoading = true;
    loadingIndicator.style.display = 'flex';
    emailList.style.display = 'none';
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
}

function hideLoading() {
    isLoading = false;
    loadingIndicator.style.display = 'none';
    emailList.style.display = 'flex';
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;
}

// Compose modal elements
const composeModal = document.getElementById('composeModal');
const closeComposeModal = document.querySelector('.close-compose');
const composeForm = document.getElementById('composeForm');
const composeFromInput = document.getElementById('composeFrom');
const composeToInput = document.getElementById('composeTo');
const composeSubjectInput = document.getElementById('composeSubject');
const composeMessageInput = document.getElementById('composeMessage');
const btnCancel = document.querySelector('.btn-cancel');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
    });
});

// Get domain list from server
fetch(`${API_URL}/stats`)
    .then(res => res.json())
    .then(data => {
        if (data.success && data.config.domains) {
            domainSelect.innerHTML = '';
            data.config.domains.forEach(domain => {
                const opt = document.createElement('option');
                opt.value = domain;
                opt.textContent = domain;
                domainSelect.appendChild(opt);
            });
        }
    })
    .catch(err => console.error('Error fetching domains:', err));

// Generate email baru
generateBtn.addEventListener('click', async () => {
    try {
        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ Generating...';
        
        const response = await fetch(`${API_URL}/generate`);
        const data = await response.json();
        
        if (data.success) {
            currentEmail = data.email;
            currentEmailInput.value = currentEmail;
            copyBtn.disabled = false;
            composeBtn.disabled = false;
            
            // Clear inbox
            emailList.innerHTML = '<div class="empty-state"><p>📭 Belum ada email</p><p class="small">Menunggu email masuk...</p></div>';
            emailCount.textContent = '(0)';
            
            // Start auto-refresh
            startAutoRefresh();
            
            showNotification('Email berhasil dibuat!', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Gagal membuat email', 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '🔄 Generate Email Baru';
    }
});

// Custom email username input - check availability
customUsernameInput.addEventListener('input', checkCustomEmailAvailability);
domainSelect.addEventListener('change', checkCustomEmailAvailability);

function checkCustomEmailAvailability() {
    const username = customUsernameInput.value.trim();
    const domain = domainSelect.value;
    // Clear previous timeout
    if (checkTimeout) {
        clearTimeout(checkTimeout);
    }
    // Reset state if empty
    if (!username) {
        availabilityMessage.textContent = '';
        availabilityMessage.className = 'availability-message';
        createBtn.disabled = true;
        accessBtn.disabled = true;
        return;
    }
    // Show checking state
    availabilityMessage.textContent = 'Mengecek ketersediaan...';
    availabilityMessage.className = 'availability-message checking';
    createBtn.disabled = true;
    accessBtn.disabled = true;
    // Debounce check
    checkTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_URL}/check/${encodeURIComponent(username)}/${encodeURIComponent(domain)}`);
            const data = await response.json();
            if (data.success) {
                if (data.available) {
                    availabilityMessage.textContent = '✓ Email tersedia - Buat baru';
                    availabilityMessage.className = 'availability-message available';
                    createBtn.disabled = false;
                    accessBtn.disabled = true;
                } else {
                    availabilityMessage.textContent = '✓ Email ditemukan - Buka inbox';
                    availabilityMessage.className = 'availability-message unavailable';
                    createBtn.disabled = true;
                    accessBtn.disabled = false;
                }
            } else {
                availabilityMessage.textContent = data.message || 'Format tidak valid';
                availabilityMessage.className = 'availability-message error';
                createBtn.disabled = true;
                accessBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            availabilityMessage.textContent = 'Error mengecek ketersediaan';
            availabilityMessage.className = 'availability-message error';
            createBtn.disabled = true;
            accessBtn.disabled = true;
        }
    }, 500);
}

// Access existing email inbox
accessBtn.addEventListener('click', async () => {
    const username = customUsernameInput.value.trim();
    const domain = domainSelect.value;
    if (!username) {
        showNotification('Username harus diisi', 'error');
        return;
    }
    try {
        accessBtn.disabled = true;
        accessBtn.textContent = '⏳ Membuka...';
        const email = `${username.toLowerCase()}@${domain}`;
        // Check if email exists and get inbox
        const response = await fetch(`${API_URL}/emails/${encodeURIComponent(email)}`);
        const data = await response.json();
        if (data.success) {
            currentEmail = email;
            currentEmailInput.value = currentEmail;
            copyBtn.disabled = false;
            composeBtn.disabled = false;
            // Display emails
            displayEmails(data.emails);
            emailCount.textContent = `(${data.count})`;
            // Switch to random tab to show the inbox
            document.querySelector('.tab-btn[data-tab="random"]').click();
            // Start auto-refresh
            startAutoRefresh();
            // Reset custom form
            customUsernameInput.value = '';
            availabilityMessage.textContent = '';
            availabilityMessage.className = 'availability-message';
            showNotification(`Inbox dibuka: ${email}`, 'success');
        } else {
            showNotification('Email tidak ditemukan', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Gagal membuka inbox', 'error');
    } finally {
        accessBtn.disabled = false;
        accessBtn.textContent = '🔓 Buka Inbox';
    }
});

// Create custom email
createBtn.addEventListener('click', async () => {
    const username = customUsernameInput.value.trim();
    const domain = domainSelect.value;
    if (!username) {
        showNotification('Username harus diisi', 'error');
        return;
    }
    try {
        createBtn.disabled = true;
        createBtn.textContent = '⏳ Membuat...';
        const response = await fetch(`${API_URL}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, domain })
        });
        const data = await response.json();
        if (data.success) {
            currentEmail = data.email;
            currentEmailInput.value = currentEmail;
            copyBtn.disabled = false;
            composeBtn.disabled = false;
            // Clear inbox
            emailList.innerHTML = '<div class="empty-state"><p>📭 Belum ada email</p><p class="small">Menunggu email masuk...</p></div>';
            emailCount.textContent = '(0)';
            // Switch to random tab to show the created email
            document.querySelector('.tab-btn[data-tab="random"]').click();
            // Start auto-refresh
            startAutoRefresh();
            // Reset custom form
            customUsernameInput.value = '';
            availabilityMessage.textContent = '';
            availabilityMessage.className = 'availability-message';
            showNotification('Email custom berhasil dibuat!', 'success');
        } else {
            showNotification(data.message || 'Gagal membuat email', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Gagal membuat email', 'error');
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = '✨ Buat Baru';
    }
});

// Copy email
copyBtn.addEventListener('click', () => {
    currentEmailInput.select();
    document.execCommand('copy');
    
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => {
        copyBtn.textContent = originalText;
    }, 2000);
});

// Refresh inbox
refreshBtn.addEventListener('click', async () => {
    if (currentEmail && !isLoading) {
        showLoading();
        await loadEmails();
        // Delay sedikit untuk smooth UX
        setTimeout(() => {
            hideLoading();
        }, 300);
    }
});

// Load emails
async function loadEmails() {
    if (!currentEmail) return;
    
    try {
        const response = await fetch(`${API_URL}/emails/${encodeURIComponent(currentEmail)}`);
        const data = await response.json();
        
        if (data.success) {
            displayEmails(data.emails);
            emailCount.textContent = `(${data.count})`;
        }
    } catch (error) {
        console.error('Error loading emails:', error);
        hideLoading();
    }
}

// Display emails
function displayEmails(emails) {
    if (emails.length === 0) {
        emailList.innerHTML = '<div class="empty-state"><p>📭 Belum ada email</p><p class="small">Menunggu email masuk...</p></div>';
        return;
    }
    
    emailList.innerHTML = emails.map(email => `
        <div class="email-item" data-id="${email.id}">
            <div class="email-from">Dari: ${escapeHtml(email.from)}</div>
            <div class="email-subject">${escapeHtml(email.subject)}</div>
            <div class="email-preview">${escapeHtml(email.preview)}...</div>
            <div class="email-date">${new Date(email.date).toLocaleString('id-ID')}</div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.email-item').forEach(item => {
        item.addEventListener('click', () => {
            showEmailDetail(item.dataset.id);
        });
    });
}

// Show email detail
async function showEmailDetail(emailId) {
    try {
        const response = await fetch(`${API_URL}/email/${emailId}`);
        const data = await response.json();
        
        if (data.success) {
            const email = data.email;
            emailDetail.innerHTML = `
                <div class="detail-from">
                    <div class="detail-label">Dari:</div>
                    <div>${escapeHtml(email.from)}</div>
                </div>
                <div class="detail-subject">
                    <div class="detail-label">Subject:</div>
                    <div>${escapeHtml(email.subject)}</div>
                </div>
                <div class="detail-date">
                    <div class="detail-label">Tanggal:</div>
                    <div>${new Date(email.date).toLocaleString('id-ID')}</div>
                </div>
                ${email.attachments.length > 0 ? `
                <div class="detail-attachments">
                    <div class="detail-label">Attachments:</div>
                    <div>${email.attachments.map(att => `📎 ${escapeHtml(att.filename)} (${formatBytes(att.size)})`).join('<br>')}</div>
                </div>
                ` : ''}
                <div class="detail-body">
                    <div class="detail-label">Pesan:</div>
                    <div>${email.html || escapeHtml(email.text).replace(/\n/g, '<br>')}</div>
                </div>
            `;
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading email detail:', error);
        showNotification('Gagal memuat detail email', 'error');
    }
}

// Compose email button
composeBtn.addEventListener('click', () => {
    if (!currentEmail) {
        showNotification('Generate email terlebih dahulu', 'error');
        return;
    }
    
    composeFromInput.value = currentEmail;
    composeToInput.value = '';
    composeSubjectInput.value = '';
    composeMessageInput.value = '';
    composeModal.style.display = 'block';
});

// Close compose modal
closeComposeModal.addEventListener('click', () => {
    composeModal.style.display = 'none';
});

btnCancel.addEventListener('click', () => {
    composeModal.style.display = 'none';
});

// Send email form
composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const from = composeFromInput.value;
    const to = composeToInput.value;
    const subject = composeSubjectInput.value;
    const message = composeMessageInput.value;
    
    try {
        const btnSend = composeForm.querySelector('.btn-send');
        btnSend.disabled = true;
        btnSend.textContent = '⏳ Mengirim...';
        
        const response = await fetch(`${API_URL}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: from,
                to: to,
                subject: subject,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Email berhasil dikirim!', 'success');
            composeModal.style.display = 'none';
            composeForm.reset();
        } else {
            showNotification(data.message || 'Gagal mengirim email', 'error');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        showNotification('Gagal mengirim email', 'error');
    } finally {
        const btnSend = composeForm.querySelector('.btn-send');
        btnSend.disabled = false;
        btnSend.textContent = '📤 Kirim Email';
    }
});

// Close modal
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
    if (e.target === composeModal) {
        composeModal.style.display = 'none';
    }
});

// Auto refresh
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        // Auto-refresh tanpa loading indicator (silent refresh)
        if (!isLoading) {
            loadEmails();
        }
    }, 5000); // Refresh setiap 5 detik
}

// Notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

const API_URL = window.location.origin + '/api';
let currentEmail = null;
let refreshInterval = null;
let isLoading = false;
let lastEmailIds = new Set(); // Track email IDs we've already seen
let defaultDomain = 'temp-mail.local';

// Sound notification untuk email baru
function playNotificationSound() {
    try {
        // Buat audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Nada notifikasi (2 beep singkat)
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);

        // Beep kedua
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();

            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);

            oscillator2.frequency.value = 1000;
            oscillator2.type = 'sine';

            gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.1);
        }, 150);
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// Get username from URL path (last non-empty segment)
const pathParts = window.location.pathname.split('/').filter(Boolean);
const username = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';

// LocalStorage key for this inbox
const STORAGE_KEY = `inbox_${username}`;

// Get emails from localStorage
function getLocalEmails() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return [];
    }
}

// Save emails to localStorage
function saveLocalEmails(emails) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Add new email to local storage
function addEmailToLocal(email) {
    const emails = getLocalEmails();
    // Check if email already exists
    if (!emails.find(e => e.id === email.id)) {
        emails.unshift(email); // Add to beginning
        saveLocalEmails(emails);
        return true;
    }
    return false;
}

// Elements
const emailAddressSpan = document.getElementById('emailAddress');
const emailCountSpan = document.getElementById('emailCount');
const expiresAtSpan = document.getElementById('expiresAt');
const copyEmailBtn = document.getElementById('copyEmail');
const refreshBtn = document.getElementById('refreshBtn');
const composeBtn = document.getElementById('composeBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const emailList = document.getElementById('emailList');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorState = document.getElementById('errorState');

// Modals
const emailModal = document.getElementById('emailModal');
const closeModal = document.querySelector('.close');
const emailDetail = document.getElementById('emailDetail');
const composeModal = document.getElementById('composeModal');
const closeComposeModal = document.querySelector('.close-compose');
const composeForm = document.getElementById('composeForm');
const composeToInput = document.getElementById('composeTo');

// Jika pengguna mengetik tanpa '@', tambahkan domain utama saat blur
if (composeToInput) {
    composeToInput.addEventListener('blur', () => {
        let v = composeToInput.value.trim();
        if (v && !v.includes('@')) {
            composeToInput.value = `${v}@${defaultDomain}`;
        }
    });
}

// Loading state
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

// Initialize
async function init() {
    if (!username) {
        showError();
        return;
    }

    try {
        // Get domain from server and save as default domain
        const statsResponse = await fetch(`${API_URL}/stats`);
        const statsData = await statsResponse.json();
        defaultDomain = statsData.success ? statsData.config.domain : 'temp-mail.local';

        currentEmail = `${username.toLowerCase()}@${defaultDomain}`;
        emailAddressSpan.textContent = currentEmail;
        document.getElementById('composeFrom').value = currentEmail;

        // Load emails from localStorage first
        showLoading();
        displayLocalEmails();
        hideLoading();

        // Start auto-refresh to check for new emails
        startAutoRefresh();
    } catch (error) {
        console.error('Error initializing:', error);
        showError();
    }
}

// Display emails from localStorage
function displayLocalEmails() {
    const emails = getLocalEmails();
    displayEmails(emails);
    emailCountSpan.textContent = `${emails.length} email`;

    // Initialize lastEmailIds
    emails.forEach(email => lastEmailIds.add(email.id));
}

// Load emails - check server for NEW emails only and add to localStorage
async function loadEmails() {
    if (!currentEmail) return;

    try {
        const response = await fetch(`${API_URL}/emails/${encodeURIComponent(currentEmail)}`);
        const data = await response.json();

        if (data.success) {
            // Check for NEW emails only
            let hasNewEmails = false;

            // Process each new email
            for (const emailPreview of data.emails) {
                if (!lastEmailIds.has(emailPreview.id)) {
                    // This is a new email, fetch full content from server
                    try {
                        const detailResponse = await fetch(`${API_URL}/email/${emailPreview.id}`);
                        const detailData = await detailResponse.json();

                        if (detailData.success && detailData.email) {
                            // Save the FULL email with text and html to localStorage
                            if (addEmailToLocal(detailData.email)) {
                                lastEmailIds.add(emailPreview.id);
                                hasNewEmails = true;
                            }
                        } else {
                            // Fallback: save preview data if full content not available
                            if (addEmailToLocal(emailPreview)) {
                                lastEmailIds.add(emailPreview.id);
                                hasNewEmails = true;
                            }
                        }
                    } catch (detailError) {
                        console.error('Error fetching email detail:', detailError);
                        // Fallback: save preview data
                        if (addEmailToLocal(emailPreview)) {
                            lastEmailIds.add(emailPreview.id);
                            hasNewEmails = true;
                        }
                    }
                }
            }

            // Refresh display if we got new emails
            if (hasNewEmails) {
                displayLocalEmails();
                showNotification('📧 Email baru masuk!', 'success');
                playNotificationSound();
            }

            // Update expires info
            if (data.expiresAt) {
                const expiresDate = new Date(data.expiresAt);
                const now = new Date();
                const diffHours = Math.round((expiresDate - now) / (1000 * 60 * 60));
                expiresAtSpan.textContent = `Expires dalam ${diffHours} jam`;
            } else {
                expiresAtSpan.textContent = 'Aktif';
            }

            // Hide error if any
            errorState.style.display = 'none';
            document.querySelector('.mail-header').style.display = 'block';
            document.querySelector('.inbox-controls').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading emails:', error);
        // Still show local emails even if server fails
        displayLocalEmails();
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

// Show email detail - get from localStorage first, fallback to server
async function showEmailDetail(emailId) {
    try {
        // Try to find in localStorage first
        const localEmails = getLocalEmails();
        let email = localEmails.find(e => e.id === emailId);

        // If not in localStorage, try server (for older emails)
        if (!email) {
            const response = await fetch(`${API_URL}/email/${emailId}`);
            const data = await response.json();
            if (data.success) {
                email = data.email;
            }
        }

        if (email) {
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
                ${email.attachments && email.attachments.length > 0 ? `
                <div class="detail-attachments">
                    <div class="detail-label">Attachments:</div>
                    <div>${email.attachments.map(att => `📎 ${escapeHtml(att.filename)} (${formatBytes(att.size)})`).join('<br>')}</div>
                </div>
                ` : ''}
                <div class="detail-body">
                    <div class="detail-label">Pesan:</div>
                    <div>
                        ${(typeof email.html === 'string' && email.html.trim()) ? email.html :
                    (typeof email.text === 'string' && email.text.trim()) ? escapeHtml(email.text).replace(/\n/g, '<br>') :
                        (typeof email.preview === 'string' && email.preview.trim()) ? escapeHtml(email.preview) :
                            'Tidak ada konten'
                }
                    </div>
                </div>
            `;
            emailModal.style.display = 'block';
        } else {
            showNotification('Email tidak ditemukan', 'error');
        }
    } catch (error) {
        console.error('Error loading email detail:', error);
        showNotification('Gagal memuat detail email', 'error');
    }
}

// Show error state
function showError() {
    document.querySelector('.mail-header').style.display = 'none';
    document.querySelector('.inbox-controls').style.display = 'none';
    emailList.style.display = 'none';
    loadingIndicator.style.display = 'none';
    errorState.style.display = 'block';
}

// Copy email address
copyEmailBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentEmail).then(() => {
        const originalText = copyEmailBtn.textContent;
        copyEmailBtn.textContent = '✓';
        setTimeout(() => {
            copyEmailBtn.textContent = originalText;
        }, 2000);
        showNotification('Email berhasil dicopy!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showNotification('Gagal copy email', 'error');
    });
});

// Refresh button
refreshBtn.addEventListener('click', async () => {
    if (!isLoading) {
        showLoading();
        await loadEmails();
        setTimeout(() => {
            hideLoading();
        }, 300);
    }
});

// Compose button
composeBtn.addEventListener('click', () => {
    document.getElementById('composeTo').value = '';
    document.getElementById('composeSubject').value = '';
    document.getElementById('composeMessage').value = '';
    composeModal.style.display = 'block';
});

// Clear cache button
clearCacheBtn.addEventListener('click', () => {
    if (confirm('Hapus semua email dari cache browser ini?\n\nEmail akan hilang permanen dari browser ini (tidak bisa dikembalikan).')) {
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);
        lastEmailIds.clear();

        // Update display
        displayLocalEmails();

        showNotification('Cache berhasil dihapus!', 'success');
    }
});

// Close modals
closeModal.addEventListener('click', () => {
    emailModal.style.display = 'none';
});

closeComposeModal.addEventListener('click', () => {
    composeModal.style.display = 'none';
});

document.querySelector('.btn-cancel').addEventListener('click', () => {
    composeModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === emailModal) {
        emailModal.style.display = 'none';
    }
    if (e.target === composeModal) {
        composeModal.style.display = 'none';
    }
});

// Compose form submit
composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const from = document.getElementById('composeFrom').value;
    const to = document.getElementById('composeTo').value;
    const subject = document.getElementById('composeSubject').value;
    const message = document.getElementById('composeMessage').value;

    // If user entered a local part only (no @), append default domain
    let toAddress = to.trim();
    if (toAddress && !toAddress.includes('@')) {
        toAddress = `${toAddress}@${defaultDomain}`;
    }
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
                to: toAddress,
                subject: subject,
                message: message
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Email berhasil dikirim!', 'success');
            composeModal.style.display = 'none';
            composeForm.reset();
            document.getElementById('composeFrom').value = currentEmail;
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

// Auto-refresh
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
        if (!isLoading) {
            loadEmails();
        }
    }, 5000); // Refresh every 5 seconds
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

// Start the app
init();

// Digital Gifts JavaScript Functions
document.addEventListener('DOMContentLoaded', function() {
    initializeGiftFunctions();
    setupGiftEventListeners();
});

function initializeGiftFunctions() {
    console.log('Gift functions initialized');
    
    // Initialize gift type icons if not already set
    updateGiftTypeIcons();
    
    // Setup QR code modal
    setupQRCodeModal();
    
    // Setup gift redemption functionality
    setupGiftRedemption();
}

function setupGiftEventListeners() {
    // Send gift form validation
    const sendGiftForm = document.querySelector('#sendGiftModal form');
    if (sendGiftForm) {
        sendGiftForm.addEventListener('submit', handleGiftSubmission);
    }
    
    // Gift type selection visual feedback
    const giftTypeSelect = document.querySelector('select[name="gift_type"]');
    if (giftTypeSelect) {
        giftTypeSelect.addEventListener('change', updateGiftPreview);
    }
    
    // QR code buttons
    document.querySelectorAll('.qr-code-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const giftId = this.dataset.giftId;
            const giftType = this.dataset.giftType;
            showQRCode(giftId, giftType);
        });
    });
    
    // Redeem gift buttons
    document.querySelectorAll('.redeem-gift-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const giftId = this.dataset.giftId;
            redeemGift(giftId);
        });
    });
}

function updateGiftTypeIcons() {
    const giftIcons = {
        'coffee': 'coffee',
        'song': 'music',
        'drink': 'glass-cheers',
        'flower': 'seedling',
        'book': 'book'
    };
    
    document.querySelectorAll('.gift-type-icon i').forEach(icon => {
        const giftCard = icon.closest('.gift-card');
        if (giftCard) {
            const giftTypeText = giftCard.querySelector('h6')?.textContent?.toLowerCase();
            const iconClass = giftIcons[giftTypeText] || 'gift';
            icon.className = `fas fa-${iconClass}`;
        }
    });
}

function handleGiftSubmission(event) {
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const recipientEmail = form.querySelector('input[name="recipient_email"]').value;
    const giftType = form.querySelector('select[name="gift_type"]').value;
    const message = form.querySelector('textarea[name="message"]').value;
    
    // Validate recipient email
    if (!isValidEmail(recipientEmail)) {
        event.preventDefault();
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Validate gift type selection
    if (!giftType) {
        event.preventDefault();
        showMessage('Please select a gift type', 'error');
        return;
    }
    
    // Show loading state
    setLoadingState(submitBtn, true, 'Sending Gift...');
    
    // Form will submit normally, loading state will be reset on page reload
}

function updateGiftPreview(event) {
    const selectedGiftType = event.target.value;
    const giftEmojis = {
        'coffee': '☕',
        'song': '🎵',
        'drink': '🍹',
        'flower': '🌸',
        'book': '📚'
    };
    
    const preview = document.getElementById('giftPreview');
    if (preview && selectedGiftType) {
        preview.innerHTML = `
            <div class="text-center p-3 bg-light rounded">
                <div class="fs-1 mb-2">${giftEmojis[selectedGiftType] || '🎁'}</div>
                <small class="text-muted">Sending: ${selectedGiftType.charAt(0).toUpperCase() + selectedGiftType.slice(1)}</small>
            </div>
        `;
        preview.style.display = 'block';
    } else if (preview) {
        preview.style.display = 'none';
    }
}

function setupQRCodeModal() {
    const qrModal = document.getElementById('qrCodeModal');
    if (qrModal) {
        qrModal.addEventListener('hidden.bs.modal', function() {
            const container = document.getElementById('qrCodeContainer');
            if (container) {
                container.innerHTML = '';
            }
        });
    }
}

function showQRCode(qrCodeData, giftType) {
    const modal = document.getElementById('qrCodeModal');
    const container = document.getElementById('qrCodeContainer');
    const title = modal.querySelector('.modal-title');
    
    if (!modal || !container) {
        showMessage('QR code modal not found', 'error');
        return;
    }
    
    // Update modal title
    if (title) {
        title.innerHTML = `<i class="fas fa-qrcode me-2"></i>${giftType ? giftType.charAt(0).toUpperCase() + giftType.slice(1) + ' ' : ''}Gift QR Code`;
    }
    
    // If qrCodeData is already a data URL, display it directly
    if (qrCodeData && qrCodeData.startsWith('data:image')) {
        displayQRCode(qrCodeData, container);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } else {
        // Otherwise, fetch QR code from server
        fetchQRCodeFromServer(qrCodeData, container, modal);
    }
}

function fetchQRCodeFromServer(giftId, container, modal) {
    // Show loading state
    container.innerHTML = `
        <div class="text-center p-4">
            <i class="fas fa-spinner fa-spin fs-2 text-primary mb-3"></i>
            <p class="text-muted">Generating QR code...</p>
        </div>
    `;
    
    fetch(`/api/gift/qr/${giftId}`)
        .then(response => response.json())
        .then(data => {
            if (data.qr_code) {
                displayQRCode(data.qr_code, container);
            } else {
                throw new Error('QR code not received');
            }
        })
        .catch(error => {
            console.error('Error fetching QR code:', error);
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-exclamation-triangle fs-2 text-warning mb-3"></i>
                    <p class="text-muted">Failed to generate QR code</p>
                    <button class="btn btn-sm btn-primary" onclick="fetchQRCodeFromServer('${giftId}', document.getElementById('qrCodeContainer'), document.getElementById('qrCodeModal'))">
                        Try Again
                    </button>
                </div>
            `;
        });
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function displayQRCode(qrCodeData, container) {
    container.innerHTML = `
        <div class="text-center">
            <img src="${qrCodeData}" alt="Gift QR Code" class="img-fluid mb-3" style="max-width: 250px;">
            <div class="d-flex gap-2 justify-content-center">
                <button class="btn btn-sm btn-outline-primary" onclick="downloadQRCode('${qrCodeData}')">
                    <i class="fas fa-download me-1"></i>Download
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="copyQRCode('${qrCodeData}')">
                    <i class="fas fa-copy me-1"></i>Copy Link
                </button>
            </div>
        </div>
    `;
}

function downloadQRCode(qrCodeData) {
    try {
        const link = document.createElement('a');
        link.download = 'wingoo-gift-qr-code.png';
        link.href = qrCodeData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('QR code downloaded successfully!', 'success');
    } catch (error) {
        console.error('Download failed:', error);
        showMessage('Failed to download QR code', 'error');
    }
}

function copyQRCode(qrCodeData) {
    // For QR codes, we'll copy the data URL
    if (window.WingooUtils && window.WingooUtils.copyToClipboard) {
        window.WingooUtils.copyToClipboard(qrCodeData);
    } else {
        // Fallback
        navigator.clipboard.writeText(qrCodeData).then(() => {
            showMessage('QR code data copied to clipboard!', 'success');
        }).catch(() => {
            showMessage('Failed to copy QR code', 'error');
        });
    }
}

function setupGiftRedemption() {
    // Setup any gift redemption functionality
    const redeemButtons = document.querySelectorAll('.redeem-gift-btn');
    redeemButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const giftId = this.dataset.giftId;
            if (giftId) {
                redeemGift(giftId);
            }
        });
    });
}

function redeemGift(giftId) {
    if (!giftId) {
        showMessage('Invalid gift ID', 'error');
        return;
    }
    
    // Show confirmation dialog
    if (!confirm('Are you sure you want to redeem this gift? This action cannot be undone.')) {
        return;
    }
    
    // Find the redeem button for this gift
    const redeemBtn = document.querySelector(`[data-gift-id="${giftId}"]`);
    
    if (redeemBtn) {
        setLoadingState(redeemBtn, true, 'Redeeming...');
    }
    
    // Send redemption request
    fetch(`/api/gift/redeem/${giftId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('Gift redeemed successfully!', 'success');
            
            // Update UI to show redeemed state
            if (redeemBtn) {
                redeemBtn.outerHTML = '<span class="badge bg-success">Redeemed</span>';
            }
            
            // Optionally reload the page to update all gift states
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to redeem gift');
        }
    })
    .catch(error => {
        console.error('Redemption error:', error);
        showMessage(error.message || 'Failed to redeem gift', 'error');
        
        if (redeemBtn) {
            setLoadingState(redeemBtn, false, 'Redeem');
        }
    });
}

function setLoadingState(button, isLoading, text) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${text}`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || text;
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showMessage(message, type = 'info') {
    // Use global showMessage function if available
    if (window.showMessage) {
        window.showMessage(message, type);
        return;
    }
    
    // Fallback implementation
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 80px; left: 1rem; right: 1rem; z-index: 1050;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Gift statistics animation
function animateGiftStats() {
    const statNumbers = document.querySelectorAll('.gift-stat h3');
    
    statNumbers.forEach(stat => {
        const finalValue = parseInt(stat.textContent);
        const duration = 1500;
        const steps = 60;
        const increment = finalValue / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= finalValue) {
                stat.textContent = finalValue;
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(current);
            }
        }, duration / steps);
    });
}

// Initialize stats animation when visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateGiftStats();
            statsObserver.unobserve(entry.target);
        }
    });
});

// Observe gift stats section
const giftStats = document.querySelector('.row.g-4.mb-5');
if (giftStats) {
    statsObserver.observe(giftStats);
}

// Export functions for global use
window.showQRCode = showQRCode;
window.redeemGift = redeemGift;
window.downloadQRCode = downloadQRCode;
window.copyQRCode = copyQRCode;

// Main Application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initializeTooltips();
    initializeModals();
    initializeFormValidation();
    initializeNavigation();
    initializeAnimations();
    
    console.log('Wingoo app initialized');
});

function initializeTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initializeModals() {
    // Initialize Bootstrap modals
    const modalElements = document.querySelectorAll('.modal');
    modalElements.forEach(modalEl => {
        const modal = new bootstrap.Modal(modalEl);
        
        // Auto-focus first input when modal opens
        modalEl.addEventListener('shown.bs.modal', function() {
            const firstInput = modalEl.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) {
                firstInput.focus();
            }
        });
    });
}

function initializeFormValidation() {
    // Add custom form validation
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            form.classList.add('was-validated');
        });
        
        // Real-time validation for email inputs
        const emailInputs = form.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', validateEmail);
        });
        
        // Real-time validation for password inputs
        const passwordInputs = form.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            input.addEventListener('input', validatePassword);
        });
    });
}

function validateEmail(event) {
    const email = event.target.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        event.target.setCustomValidity('Please enter a valid email address');
    } else {
        event.target.setCustomValidity('');
    }
}

function validatePassword(event) {
    const password = event.target.value;
    const minLength = 6;
    
    if (password.length < minLength) {
        event.target.setCustomValidity(`Password must be at least ${minLength} characters long`);
    } else {
        event.target.setCustomValidity('');
    }
}

function initializeNavigation() {
    // Highlight current page in navigation
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
    
    // Mobile menu auto-close
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            });
        });
    }
}

function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements with animation class
    const animatedElements = document.querySelectorAll('.card, .feature-card, .interest-card');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

// Utility Functions
function showLoader(element) {
    if (element) {
        element.classList.add('loading');
    }
}

function hideLoader(element) {
    if (element) {
        element.classList.remove('loading');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showMessage('Copied to clipboard!', 'success');
        } else {
            showMessage('Failed to copy text', 'error');
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        showMessage('Failed to copy text', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Network status handling
function handleNetworkStatus() {
    const updateOnlineStatus = () => {
        if (navigator.onLine) {
            hideNetworkMessage();
        } else {
            showNetworkMessage();
        }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Check initial status
    updateOnlineStatus();
}

function showNetworkMessage() {
    const existingMessage = document.getElementById('network-message');
    if (existingMessage) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'network-message';
    messageDiv.className = 'alert alert-warning alert-dismissible fade show position-fixed';
    messageDiv.style.cssText = 'top: 80px; left: 1rem; right: 1rem; z-index: 1050;';
    messageDiv.innerHTML = `
        <i class="fas fa-wifi me-2"></i>
        You appear to be offline. Some features may not work properly.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(messageDiv);
}

function hideNetworkMessage() {
    const networkMessage = document.getElementById('network-message');
    if (networkMessage) {
        networkMessage.remove();
    }
}

// Initialize network status monitoring
handleNetworkStatus();

// Error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    
    // Only show user-friendly messages for certain types of errors
    if (event.error && event.error.name !== 'ResizeObserver') {
        showMessage('An unexpected error occurred. Please refresh the page if problems persist.', 'error');
    }
});

// Service Worker registration (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Note: Service worker file would need to be created separately
        // navigator.serviceWorker.register('/sw.js');
    });
}

// Export utility functions for global use
window.WingooUtils = {
    showLoader,
    hideLoader,
    debounce,
    formatDate,
    formatTime,
    copyToClipboard
};

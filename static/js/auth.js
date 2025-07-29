// Authentication Functions
let authFunctions = null;

// Wait for Firebase to be ready
window.addEventListener('firebaseReady', async (event) => {
    const auth = event.detail.auth;
    
    // Load Firebase auth functions
    try {
        const authModule = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js');
        authFunctions = {
            signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
            createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
            signOut: authModule.signOut,
            onAuthStateChanged: authModule.onAuthStateChanged,
            updateProfile: authModule.updateProfile
        };
        
        setupAuthStateListener();
        setupAuthForms();
    } catch (error) {
        console.error('Failed to load Firebase auth functions:', error);
    }
});

function setupAuthStateListener() {
    if (!auth || !authFunctions) return;

    authFunctions.onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            try {
                const token = await user.getIdToken();
                await verifyTokenWithServer(token);
            } catch (error) {
                console.error('Authentication verification failed:', error);
                showMessage('Authentication failed. Please try again.', 'error');
            }
        } else {
            // User is signed out
            console.log('User signed out');
        }
    });
}

function setupAuthForms() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    if (!auth || !authFunctions) {
        showMessage('Authentication system not ready. Please wait and try again.', 'error');
        return;
    }
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    try {
        setLoadingState(submitBtn, true, 'Signing in...');
        
        const userCredential = await authFunctions.signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        
        await verifyTokenWithServer(token);
        
    } catch (error) {
        console.error('Login error:', error);
        handleAuthError(error);
    } finally {
        setLoadingState(submitBtn, false, 'Login');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    if (!auth || !authFunctions) {
        showMessage('Authentication system not ready. Please wait and try again.', 'error');
        return;
    }
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        setLoadingState(submitBtn, true, 'Creating account...');
        
        const userCredential = await authFunctions.createUserWithEmailAndPassword(auth, email, password);
        
        // Update user profile with display name
        const displayName = email.split('@')[0];
        await authFunctions.updateProfile(userCredential.user, { displayName });
        
        const token = await userCredential.user.getIdToken();
        
        await verifyTokenWithServer(token);
        
    } catch (error) {
        console.error('Registration error:', error);
        handleAuthError(error);
    } finally {
        setLoadingState(submitBtn, false, 'Create Account');
    }
}

async function verifyTokenWithServer(token) {
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Authentication successful!', 'success');
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1000);
        } else {
            throw new Error(data.message || 'Authentication failed');
        }
    } catch (error) {
        console.error('Server verification failed:', error);
        throw error;
    }
}

function handleAuthError(error) {
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'No account found with this email address.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password.';
            break;
        case 'auth/email-already-in-use':
            message = 'An account already exists with this email address.';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak. Please choose a stronger password.';
            break;
        case 'auth/invalid-email':
            message = 'Please enter a valid email address.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
        default:
            message = error.message || 'Authentication failed. Please try again.';
    }
    
    showMessage(message, 'error');
}

function setLoadingState(button, isLoading, text) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${text}`;
    } else {
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-${button.id.includes('register') ? 'user-plus' : 'sign-in-alt'} me-2"></i>${text}`;
    }
}

function showMessage(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of page
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Logout function
async function logout() {
    try {
        if (auth && authFunctions) {
            await authFunctions.signOut(auth);
        }
        window.location.href = '/logout';
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error during logout', 'error');
    }
}

// Export functions for global use
window.logout = logout;
window.showMessage = showMessage;

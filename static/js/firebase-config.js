// Firebase Configuration and Initialization

// Initialize Firebase app
let app, auth, db;

async function initializeFirebase() {
    try {
        // Get config from global variable set in template
        const firebaseConfig = window.firebaseConfig;
        
        if (!firebaseConfig || !firebaseConfig.apiKey) {
            console.warn('Firebase configuration missing - authentication disabled');
            return null;
        }

        // Dynamically import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js');

        // Initialize Firebase
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        console.log('Firebase initialized successfully');
        
        // Dispatch custom event to notify other scripts
        window.dispatchEvent(new CustomEvent('firebaseReady', {
            detail: { auth, db }
        }));
        
        return { app, auth, db };
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        return null;
    }
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}

// Export for use in other modules
window.getFirebaseAuth = () => auth;
window.getFirebaseDb = () => db;

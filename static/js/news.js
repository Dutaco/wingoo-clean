// News and Audio Player JavaScript Functions
let audioContext = null;
let currentSpeechSynthesis = null;
let backgroundAudio = null;
let isPlaying = false;
let currentArticleIndex = 0;
let articles = [];
let playAllMode = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeNewsPlayer();
    setupAudioControls();
    setupNewsEventListeners();
    loadArticles();
});

function initializeNewsPlayer() {
    console.log('News player initialized');
    
    // Initialize Web Audio API
    if (window.AudioContext || window.webkitAudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Setup Speech Synthesis
    if ('speechSynthesis' in window) {
        // Load available voices
        speechSynthesis.onvoiceschanged = function() {
            console.log('Speech synthesis voices loaded');
        };
    } else {
        console.warn('Speech synthesis not supported');
        showMessage('Text-to-speech is not supported in your browser', 'warning');
    }
    
    // Initialize background music
    initializeBackgroundMusic();
}

function setupAudioControls() {
    const playAllBtn = document.getElementById('playAllBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const volumeControl = document.getElementById('volumeControl');
    
    if (playAllBtn) {
        playAllBtn.addEventListener('click', playAllArticles);
    }
    
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopAudio);
    }
    
    if (volumeControl) {
        volumeControl.addEventListener('input', updateVolume);
        // Set initial volume
        updateVolume({ target: { value: volumeControl.value } });
    }
    
    // Setup article play buttons
    setupArticlePlayButtons();
}

function setupNewsEventListeners() {
    // Article play buttons
    document.querySelectorAll('.play-article-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const title = this.dataset.title;
            const description = this.dataset.description;
            playArticle(title, description, this);
        });
    });
    
    // Interest filter buttons (already handled in template)
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function setupArticlePlayButtons() {
    document.querySelectorAll('.play-article-btn').forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const articleCard = this.closest('.article-card');
            const title = this.dataset.title;
            const description = this.dataset.description;
            
            currentArticleIndex = index;
            playArticle(title, description, this);
        });
    });
}

function loadArticles() {
    // Load articles from the page
    articles = [];
    document.querySelectorAll('.article-card').forEach((card, index) => {
        const title = card.querySelector('.card-title')?.textContent || '';
        const description = card.querySelector('.card-text')?.textContent || '';
        const playBtn = card.querySelector('.play-article-btn');
        
        articles.push({
            title: title.trim(),
            description: description.trim(),
            element: card,
            playButton: playBtn,
            index: index
        });
    });
    
    console.log(`Loaded ${articles.length} articles`);
}

function initializeBackgroundMusic() {
    // Create background music using Web Audio API
    if (!audioContext) return;
    
    try {
        // Create a simple ambient background tone
        createBackgroundMusic();
    } catch (error) {
        console.warn('Background music initialization failed:', error);
    }
}

function createBackgroundMusic() {
    if (!audioContext) return;
    
    // Create oscillators for ambient background music
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Set frequencies for a calming ambient sound
    oscillator1.frequency.setValueAtTime(220, audioContext.currentTime); // A3
    oscillator2.frequency.setValueAtTime(330, audioContext.currentTime); // E4
    
    // Use sine waves for smooth tones
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    // Set very low volume for background
    gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
    
    // Connect nodes
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Store reference
    backgroundAudio = {
        oscillator1,
        oscillator2,
        gainNode,
        isPlaying: false
    };
}

function startBackgroundMusic() {
    if (!backgroundAudio || backgroundAudio.isPlaying) return;
    
    try {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        backgroundAudio.oscillator1.start();
        backgroundAudio.oscillator2.start();
        backgroundAudio.isPlaying = true;
        
        console.log('Background music started');
    } catch (error) {
        console.warn('Failed to start background music:', error);
    }
}

function stopBackgroundMusic() {
    if (!backgroundAudio || !backgroundAudio.isPlaying) return;
    
    try {
        backgroundAudio.oscillator1.stop();
        backgroundAudio.oscillator2.stop();
        backgroundAudio.isPlaying = false;
        
        // Recreate for next use
        setTimeout(() => {
            createBackgroundMusic();
        }, 100);
        
        console.log('Background music stopped');
    } catch (error) {
        console.warn('Failed to stop background music:', error);
    }
}

function playAllArticles() {
    if (articles.length === 0) {
        showMessage('No articles available to play', 'warning');
        return;
    }
    
    playAllMode = true;
    currentArticleIndex = 0;
    
    const playAllBtn = document.getElementById('playAllBtn');
    if (playAllBtn) {
        playAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Playing All';
        playAllBtn.disabled = true;
    }
    
    showAudioPlayer();
    playCurrentArticle();
}

function playCurrentArticle() {
    if (currentArticleIndex >= articles.length) {
        // Finished playing all articles
        stopAudio();
        showMessage('Finished playing all articles', 'success');
        return;
    }
    
    const article = articles[currentArticleIndex];
    const fullText = `${article.title}. ${article.description}`;
    
    playTextToSpeech(fullText, article.title, () => {
        if (playAllMode) {
            currentArticleIndex++;
            setTimeout(() => {
                playCurrentArticle();
            }, 1000); // Brief pause between articles
        }
    });
}

function playArticle(title, description, button) {
    playAllMode = false;
    
    // Update button state
    if (button) {
        setLoadingState(button, true, 'Playing...');
    }
    
    const fullText = `${title}. ${description}`;
    
    showAudioPlayer();
    playTextToSpeech(fullText, title, () => {
        if (button) {
            setLoadingState(button, false, 'Play');
        }
    });
}

function playTextToSpeech(text, title, onEnd) {
    // Stop any current speech
    if (currentSpeechSynthesis) {
        speechSynthesis.cancel();
    }
    
    if (!('speechSynthesis' in window)) {
        showMessage('Text-to-speech is not supported in your browser', 'error');
        return;
    }
    
    // Create speech synthesis utterance
    currentSpeechSynthesis = new SpeechSynthesisUtterance(text);
    
    // Configure speech parameters
    currentSpeechSynthesis.rate = 0.9; // Slightly slower for better comprehension
    currentSpeechSynthesis.pitch = 1.0;
    currentSpeechSynthesis.volume = 0.8;
    
    // Try to use a good quality voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Google') || voice.name.includes('Microsoft'))
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
        currentSpeechSynthesis.voice = preferredVoice;
    }
    
    // Event handlers
    currentSpeechSynthesis.onstart = function() {
        isPlaying = true;
        updatePlayPauseButton(true);
        updateCurrentTitle(title);
        startBackgroundMusic();
        
        // Start progress animation
        animateProgress();
    };
    
    currentSpeechSynthesis.onend = function() {
        isPlaying = false;
        updatePlayPauseButton(false);
        stopBackgroundMusic();
        resetProgress();
        
        if (onEnd) onEnd();
    };
    
    currentSpeechSynthesis.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        showMessage('Error playing audio. Please try again.', 'error');
        isPlaying = false;
        updatePlayPauseButton(false);
        
        if (onEnd) onEnd();
    };
    
    // Start speaking
    speechSynthesis.speak(currentSpeechSynthesis);
}

function togglePlayPause() {
    if (!currentSpeechSynthesis) {
        showMessage('No audio to play', 'warning');
        return;
    }
    
    if (isPlaying) {
        speechSynthesis.pause();
        isPlaying = false;
        updatePlayPauseButton(false);
        stopBackgroundMusic();
    } else {
        speechSynthesis.resume();
        isPlaying = true;
        updatePlayPauseButton(true);
        startBackgroundMusic();
    }
}

function stopAudio() {
    if (currentSpeechSynthesis) {
        speechSynthesis.cancel();
        currentSpeechSynthesis = null;
    }
    
    isPlaying = false;
    playAllMode = false;
    
    updatePlayPauseButton(false);
    stopBackgroundMusic();
    resetProgress();
    hideAudioPlayer();
    
    // Reset play all button
    const playAllBtn = document.getElementById('playAllBtn');
    if (playAllBtn) {
        playAllBtn.innerHTML = '<i class="fas fa-play me-2"></i>Play All';
        playAllBtn.disabled = false;
    }
    
    // Reset all article play buttons
    document.querySelectorAll('.play-article-btn').forEach(btn => {
        setLoadingState(btn, false, 'Play');
    });
}

function updateVolume(event) {
    const volume = event.target.value / 100;
    
    // Update speech synthesis volume
    if (currentSpeechSynthesis) {
        currentSpeechSynthesis.volume = volume;
    }
    
    // Update background music volume
    if (backgroundAudio && backgroundAudio.gainNode) {
        backgroundAudio.gainNode.gain.setValueAtTime(volume * 0.02, audioContext.currentTime);
    }
}

function updatePlayPauseButton(isPlaying) {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        const icon = playPauseBtn.querySelector('i');
        if (icon) {
            icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }
}

function updateCurrentTitle(title) {
    const titleElement = document.getElementById('currentTitle');
    if (titleElement) {
        titleElement.textContent = title || 'Playing article';
    }
}

function showAudioPlayer() {
    const playerContainer = document.getElementById('audioPlayerContainer');
    if (playerContainer) {
        playerContainer.style.display = 'block';
        playerContainer.classList.add('fade-in');
    }
}

function hideAudioPlayer() {
    const playerContainer = document.getElementById('audioPlayerContainer');
    if (playerContainer) {
        playerContainer.style.display = 'none';
    }
}

function animateProgress() {
    const progressBar = document.getElementById('audioProgress');
    if (!progressBar || !isPlaying) return;
    
    // Simple progress animation (since we can't get exact speech progress)
    let width = 0;
    const duration = currentSpeechSynthesis ? (currentSpeechSynthesis.text.length * 50) : 10000; // Estimate
    const increment = 100 / (duration / 100);
    
    const progressInterval = setInterval(() => {
        if (!isPlaying || width >= 100) {
            clearInterval(progressInterval);
            return;
        }
        
        width += increment;
        progressBar.style.width = Math.min(width, 100) + '%';
    }, 100);
}

function resetProgress() {
    const progressBar = document.getElementById('audioProgress');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

function handleKeyboardShortcuts(event) {
    // Only handle shortcuts when audio player is visible
    const playerContainer = document.getElementById('audioPlayerContainer');
    if (!playerContainer || playerContainer.style.display === 'none') return;
    
    switch (event.code) {
        case 'Space':
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                togglePlayPause();
            }
            break;
        case 'Escape':
            stopAudio();
            break;
        case 'ArrowRight':
            if (playAllMode && currentArticleIndex < articles.length - 1) {
                event.preventDefault();
                currentArticleIndex++;
                playCurrentArticle();
            }
            break;
        case 'ArrowLeft':
            if (playAllMode && currentArticleIndex > 0) {
                event.preventDefault();
                currentArticleIndex--;
                playCurrentArticle();
            }
            break;
    }
}

function setLoadingState(button, isLoading, text) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || '<i class="fas fa-play"></i>';
    }
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

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopAudio();
});

// Export functions for global use
window.playArticle = playArticle;
window.togglePlayPause = togglePlayPause;
window.stopAudio = stopAudio;
window.playAllArticles = playAllArticles;

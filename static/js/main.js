// ==================== FRIDAY AI - MAIN ENTRYPOINT ====================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize user authentication and profile state
    if (window.FridayAuth) {
        window.FridayAuth.init();
    }

    // 2. Initialize voice output (TTS)
    if (window.FridayVoice) {
        window.FridayVoice.init();
    }

    // 3. Initialize microphone speech input (STT)
    if (window.FridaySpeechInput) {
        window.FridaySpeechInput.init();
    }

    // 4. Initialize sessions and chat history sidebar
    if (window.FridaySessions) {
        window.FridaySessions.init();
        window.FridaySessions.loadSessions();
    }

    // 5. Initialize messaging and chat interactions
    if (window.FridayChat) {
        window.FridayChat.init();
    }

    // Focus prompt input
    const input = document.getElementById('user-input');
    if (input) input.focus();
});

// ==================== FRIDAY AI - SCRIPT ENTRYPOINT ====================
// The codebase has been cleanly separated into modular files in /static/js/:
//   - /static/js/voice.js        : TTS text-to-speech engine & chunking
//   - /static/js/speech-input.js : STT microphone voice input
//   - /static/js/auth.js         : User profile, ChatGPT login screen & settings
//   - /static/js/sessions.js     : Chat sessions & sidebar history
//   - /static/js/chat.js         : Messages rendering, markdown & chat form
//   - /static/js/main.js         : Bootstrap coordinator

document.addEventListener('DOMContentLoaded', () => {
    if (window.FridayAuth) FridayAuth.init();
    if (window.FridayVoice) FridayVoice.init();
    if (window.FridaySpeechInput) FridaySpeechInput.init();
    if (window.FridaySessions) {
        FridaySessions.init();
        FridaySessions.loadSessions();
    }
    if (window.FridayChat) FridayChat.init();

    const input = document.getElementById('user-input');
    if (input) input.focus();
});

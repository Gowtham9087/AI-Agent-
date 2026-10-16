// ==================== FRIDAY AI - SPEECH INPUT (STT) MODULE ====================
const FridaySpeechInput = (function() {
    let recognition = null;
    let isListening = false;
    let speechDebounceTimer = null;

    const micBtn = document.getElementById('mic-btn');
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-form');
    const sendBtn = document.getElementById('send-btn');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    function init() {
        if (!SpeechRecognition) return;

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            if (micBtn) {
                micBtn.classList.add('listening');
                micBtn.title = 'Listening... click to stop';
            }
            if (userInput) userInput.placeholder = 'Listening... speak to Friday 🎙️';
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            if (userInput) {
                userInput.value = transcript;
                userInput.style.height = 'auto';
                userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
            }
            if (sendBtn && userInput) {
                sendBtn.disabled = userInput.value.trim() === '';
            }

            if (speechDebounceTimer) clearTimeout(speechDebounceTimer);
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
            // Automatically submit after a brief pause when user finishes speaking
            if (userInput && userInput.value.trim()) {
                speechDebounceTimer = setTimeout(() => {
                    if (userInput && userInput.value.trim() && chatForm) {
                        chatForm.dispatchEvent(new Event('submit'));
                    }
                }, 900);
            }
        };

        if (micBtn) {
            micBtn.addEventListener('click', () => {
                if (isListening) {
                    stopListening();
                } else {
                    startListening();
                }
            });
        }
    }

    function startListening() {
        if (!SpeechRecognition) {
            alert('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
            return;
        }
        if (window.FridayVoice) window.FridayVoice.stopSpeaking();
        if (speechDebounceTimer) clearTimeout(speechDebounceTimer);

        if (userInput) userInput.value = '';
        if (sendBtn) sendBtn.disabled = true;

        try {
            recognition.start();
        } catch (err) {
            console.warn('Recognition start error:', err);
        }
    }

    function stopListening() {
        isListening = false;
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.title = 'Speak to Friday';
        }
        if (userInput) userInput.placeholder = 'Message Friday...';
        try {
            if (recognition) recognition.stop();
        } catch (err) {}
    }

    return {
        init,
        startListening,
        stopListening,
        isListening: () => isListening
    };
})();

window.FridaySpeechInput = FridaySpeechInput;

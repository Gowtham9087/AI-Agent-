// ==================== FRIDAY AI - TEXT-TO-SPEECH (TTS) MODULE ====================
// Hold references globally to prevent V8 GC from prematurely collecting active utterances
window.__activeSpeechUtterances = [];

const FridayVoice = (function() {
    let voiceEnabled = true;
    let availableVoices = [];
    let speechQueue = [];
    let isSpeakingActive = false;
    let currentSpeakingBtn = null;
    let speechHeartbeatTimer = null;

    const voiceBtn = document.getElementById('voice-btn');
    const voiceLabel = document.getElementById('voice-label');
    const voiceIconContainer = document.getElementById('voice-icon-container');

    const ICON_SPEECH_ON = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const ICON_SPEECH_OFF = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
    const ICON_SPEAKER_SMALL = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const ICON_STOP_SMALL = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

    function loadVoices() {
        if (window.speechSynthesis) {
            const v = window.speechSynthesis.getVoices();
            if (v && v.length > 0) {
                availableVoices = v;
            }
        }
    }

    function resetSpeakingBtn(btn) {
        if (!btn) return;
        btn.classList.remove('speaking');
        btn.innerHTML = `${ICON_SPEAKER_SMALL} Read aloud`;
    }

    function stopSpeaking() {
        isSpeakingActive = false;
        speechQueue = [];
        window.__activeSpeechUtterances = [];

        if (speechHeartbeatTimer) {
            clearInterval(speechHeartbeatTimer);
            speechHeartbeatTimer = null;
        }

        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
            } catch (e) {}
        }

        if (currentSpeakingBtn) {
            resetSpeakingBtn(currentSpeakingBtn);
            currentSpeakingBtn = null;
        }
    }

    function updateVoiceButton() {
        if (!voiceBtn) return;
        if (voiceEnabled) {
            voiceBtn.classList.add('active');
            if (voiceLabel) voiceLabel.textContent = 'Voice On';
            if (voiceIconContainer) voiceIconContainer.innerHTML = ICON_SPEECH_ON;
            if (window.speechSynthesis && window.speechSynthesis.paused) {
                try { window.speechSynthesis.resume(); } catch (e) {}
            }
        } else {
            voiceBtn.classList.remove('active');
            if (voiceLabel) voiceLabel.textContent = 'Muted';
            if (voiceIconContainer) voiceIconContainer.innerHTML = ICON_SPEECH_OFF;
            stopSpeaking();
        }
    }

    function toggleVoice() {
        voiceEnabled = !voiceEnabled;
        updateVoiceButton();
        return voiceEnabled;
    }

    function cleanMarkdownForSpeech(text) {
        if (!text) return '';

        // 1. Completely omit fenced code blocks (```...```) so code is not read aloud
        let cleaned = text.replace(/```[\s\S]*?```/g, '');

        // 2. Remove HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        // 3. Line-by-line filtering: remove header underlines (===, ---), divider lines, and raw code syntax lines
        const lines = cleaned.split('\n');
        const filteredLines = [];

        for (let rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // Skip divider lines or header underlines made of symbols: ===, ---, ***, ___, ###, ~~~
            if (/^[=\-_*#~`|<>:]{2,}$/.test(line)) continue;

            // Skip lines that are purely programming code syntax
            if (/^(import |from |def |class |return |const |let |var |if |elif |else:|for |while |try:|except |print\(|console\.)/.test(line)) continue;
            if (/^[{}()\[\];]+$/.test(line)) continue;

            filteredLines.push(rawLine);
        }

        cleaned = filteredLines.join('\n');

        // 4. Strip markdown headings
        cleaned = cleaned.replace(/#{1,6}\s*/g, '');

        // 5. Remove bold / italic / strikethrough formatting
        cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
        cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
        cleaned = cleaned.replace(/~~(.*?)~~/g, '$1');

        // 6. Inline code: `varName` -> varName
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

        // 7. Links: [text](url) -> text
        cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        cleaned = cleaned.replace(/https?:\/\/\S+/g, 'link');

        // 8. Remove ALL equal signs (=, ==, ===) so it NEVER reads 'equals'
        cleaned = cleaned.replace(/=+/g, ' ');

        // 9. Remove other symbol repeats (---, ***, ___)
        cleaned = cleaned.replace(/[-_~*#]{2,}/g, ' ');

        // 10. Clean bullet markers at start of line
        cleaned = cleaned.replace(/^[\s*+-]+/gm, '');
        cleaned = cleaned.replace(/\|/g, ' ');
        cleaned = cleaned.replace(/&/g, ' and ');

        // 11. Remove emojis
        cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}\u{1F1E0}-\u{1F1FF}]/gu, '');

        // 12. Normalize whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // If the message only contained code and no explanatory text
        if (!cleaned) {
            return 'The response contains a code snippet. You can view and copy the code in the chat.';
        }

        return cleaned;
    }

    function splitTextIntoSpeechChunks(text, maxLen = 140) {
        if (!text) return [];
        const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
        const chunks = [];
        let current = '';

        for (const raw of sentences) {
            const s = raw.trim();
            if (!s) continue;
            if ((current + ' ' + s).length <= maxLen) {
                current = current ? (current + ' ' + s) : s;
            } else {
                if (current) chunks.push(current);
                if (s.length > maxLen) {
                    const words = s.split(/\s+/);
                    let sub = '';
                    for (const w of words) {
                        if ((sub + ' ' + w).length <= maxLen) {
                            sub = sub ? (sub + ' ' + w) : w;
                        } else {
                            if (sub) chunks.push(sub);
                            sub = w;
                        }
                    }
                    current = sub;
                } else {
                    current = s;
                }
            }
        }
        if (current) chunks.push(current);
        return chunks.filter(c => c.length > 0);
    }

    function getPreferredVoice() {
        if (!availableVoices || availableVoices.length === 0) {
            loadVoices();
        }
        if (!availableVoices || availableVoices.length === 0) return null;

        const priorityChecks = [
            v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online')),
            v => v.lang.startsWith('en') && v.name.includes('Google'),
            v => v.lang.startsWith('en') && (v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Guy')),
            v => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('David') || v.name.includes('Mark')),
            v => v.lang.startsWith('en'),
            v => true
        ];

        for (const test of priorityChecks) {
            const found = availableVoices.find(test);
            if (found) return found;
        }
        return availableVoices[0] || null;
    }

    function playSpeech(text, btn = null) {
        if (!('speechSynthesis' in window)) {
            console.warn("Speech synthesis is not supported in this browser.");
            return;
        }

        // Toggle stop if already playing on this exact button
        if (currentSpeakingBtn === btn && isSpeakingActive) {
            stopSpeaking();
            return;
        }

        // Stop whatever else is currently speaking
        stopSpeaking();

        const cleanText = cleanMarkdownForSpeech(text);
        if (!cleanText) return;

        const chunks = splitTextIntoSpeechChunks(cleanText);
        if (chunks.length === 0) return;

        speechQueue = [...chunks];
        isSpeakingActive = true;

        if (btn) {
            currentSpeakingBtn = btn;
            btn.classList.add('speaking');
            btn.innerHTML = `${ICON_STOP_SMALL} Stop reading`;
        }

        // Unpause speech synthesis engine
        try {
            window.speechSynthesis.resume();
        } catch (e) {}

        // Heartbeat to prevent Chromium from pausing or dropping long speech
        speechHeartbeatTimer = setInterval(() => {
            if (!isSpeakingActive) {
                clearInterval(speechHeartbeatTimer);
                return;
            }
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 7000);

        playNextSpeechChunk();
    }

    function playNextSpeechChunk() {
        if (!isSpeakingActive || speechQueue.length === 0) {
            stopSpeaking();
            return;
        }

        const chunk = speechQueue.shift();
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        const voice = getPreferredVoice();
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || 'en-US';
        } else {
            utterance.lang = 'en-US';
        }

        // Retain global reference so V8 GC does not drop it mid-speech
        window.__activeSpeechUtterances.push(utterance);

        utterance.onend = () => {
            const idx = window.__activeSpeechUtterances.indexOf(utterance);
            if (idx !== -1) window.__activeSpeechUtterances.splice(idx, 1);

            if (isSpeakingActive) {
                if (speechQueue.length > 0) {
                    playNextSpeechChunk();
                } else {
                    stopSpeaking();
                }
            }
        };

        utterance.onerror = (e) => {
            console.warn("Speech chunk error:", e);
            const idx = window.__activeSpeechUtterances.indexOf(utterance);
            if (idx !== -1) window.__activeSpeechUtterances.splice(idx, 1);

            if (!isSpeakingActive || e.error === 'interrupted' || e.error === 'canceled') {
                stopSpeaking();
                return;
            }

            if (speechQueue.length > 0) {
                playNextSpeechChunk();
            } else {
                stopSpeaking();
            }
        };

        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
    }

    function init() {
        if (window.speechSynthesis) {
            loadVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                loadVoices();
            };
        }
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                toggleVoice();
            });
        }
        updateVoiceButton();
    }

    return {
        init,
        stopSpeaking,
        playSpeech,
        updateVoiceButton,
        toggleVoice,
        isVoiceEnabled: () => voiceEnabled,
        setVoiceEnabled: (val) => { voiceEnabled = val; updateVoiceButton(); }
    };
})();

window.FridayVoice = FridayVoice;

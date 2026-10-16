// ==================== FRIDAY AI - CHAT & MESSAGING MODULE ====================
const FridayChat = (function() {
    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const messagesList = document.getElementById('messages-list');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    const ICON_AI_AVATAR = `<img src="/static/logo.png" alt="Friday" class="friday-avatar-img">`;
    const ICON_SPEAKER_SMALL = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;

    // Configure Marked Markdown parser
    if (window.marked) {
        marked.setOptions({
            gfm: true,
            breaks: true,
            highlight: function(code, lang) {
                if (window.hljs && lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (e) {}
                }
                return code;
            }
        });
    }

    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    function parseMarkdownContent(content) {
        if (window.marked) {
            try {
                return marked.parse(content);
            } catch (e) {}
        }
        const safe = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<p>${safe.replace(/\n/g, '<br>')}</p>`;
    }

    function renderMessages(messages) {
        if (!messagesList || !welcomeScreen) return;
        messagesList.innerHTML = '';
        if (!messages || messages.length === 0) {
            welcomeScreen.style.display = 'flex';
            return;
        }

        welcomeScreen.style.display = 'none';
        messages.forEach(msg => {
            appendMessageUI(msg.role, msg.content, false);
        });
        scrollToBottom();
    }

    function appendMessageUI(role, content, shouldScroll = true) {
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (!messagesList) return null;

        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user-row' : 'assistant-row'}`;

        if (role === 'user') {
            const bubble = document.createElement('div');
            bubble.className = 'user-bubble';
            bubble.textContent = content;
            row.appendChild(bubble);
        } else {
            const avatar = document.createElement('div');
            avatar.className = 'assistant-avatar';
            avatar.innerHTML = ICON_AI_AVATAR;

            const body = document.createElement('div');
            body.className = 'assistant-body';
            body.innerHTML = parseMarkdownContent(content);

            // Enhance code blocks with copy buttons
            body.querySelectorAll('pre').forEach(pre => {
                const codeEl = pre.querySelector('code');
                const lang = (codeEl?.className.match(/language-(\w+)/) || [])[1] || 'code';

                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-container';

                const header = document.createElement('div');
                header.className = 'code-header';
                header.innerHTML = `
                    <span>${lang}</span>
                    <button class="copy-code-btn">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy code
                    </button>
                `;

                header.querySelector('.copy-code-btn').addEventListener('click', (e) => {
                    navigator.clipboard.writeText(codeEl.innerText);
                    const btn = e.currentTarget;
                    btn.innerHTML = 'Copied!';
                    setTimeout(() => {
                        btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy code`;
                    }, 2000);
                });

                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(header);
                wrapper.appendChild(pre);
            });

            // Action buttons (Copy text / Read aloud)
            const actions = document.createElement('div');
            actions.className = 'message-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-action-btn';
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
                }, 2000);
            });

            const speakBtn = document.createElement('button');
            speakBtn.className = 'msg-action-btn read-aloud-btn';
            speakBtn.innerHTML = `${ICON_SPEAKER_SMALL} Read aloud`;
            speakBtn.addEventListener('click', () => {
                if (window.FridayVoice) {
                    window.FridayVoice.playSpeech(content, speakBtn);
                }
            });

            actions.appendChild(copyBtn);
            actions.appendChild(speakBtn);
            body.appendChild(actions);

            row.appendChild(avatar);
            row.appendChild(body);
        }

        messagesList.appendChild(row);
        if (shouldScroll) scrollToBottom();
        return row;
    }

    function showTypingIndicator() {
        if (!messagesList) return;
        const row = document.createElement('div');
        row.className = 'message-row assistant-row typing-row';
        row.id = 'typing-row';

        const avatar = document.createElement('div');
        avatar.className = 'assistant-avatar';
        avatar.innerHTML = ICON_AI_AVATAR;

        const dots = document.createElement('div');
        dots.className = 'typing-dots';
        dots.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;

        row.appendChild(avatar);
        row.appendChild(dots);
        messagesList.appendChild(row);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const row = document.getElementById('typing-row');
        if (row) row.remove();
    }

    function init() {
        if (userInput) {
            userInput.addEventListener('input', () => {
                userInput.style.height = 'auto';
                userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
                if (sendBtn) sendBtn.disabled = userInput.value.trim() === '';
            });

            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (userInput.value.trim() && sendBtn && !sendBtn.disabled) {
                        if (chatForm) chatForm.dispatchEvent(new Event('submit'));
                    }
                }
            });
        }

        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!userInput) return;
                const message = userInput.value.trim();
                if (!message) return;

                // Prime speech synthesis during user gesture
                if (window.speechSynthesis && window.FridayVoice && window.FridayVoice.isVoiceEnabled()) {
                    try { window.speechSynthesis.resume(); } catch (err) {}
                }

                userInput.value = '';
                userInput.style.height = 'auto';
                if (sendBtn) sendBtn.disabled = true;

                appendMessageUI('user', message, true);
                showTypingIndicator();

                const activeSid = window.FridaySessions ? window.FridaySessions.getActiveSessionId() : null;

                try {
                    const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_id: activeSid,
                            message: message
                        })
                    });

                    const data = await res.json();
                    removeTypingIndicator();

                    if (data.session_id && window.FridaySessions) {
                        window.FridaySessions.setActiveSessionId(data.session_id);
                    }

                    if (data.response) {
                        const assistantRow = appendMessageUI('assistant', data.response, true);
                        const speakBtn = assistantRow ? assistantRow.querySelector('.read-aloud-btn') : null;
                        if (window.FridayVoice && window.FridayVoice.isVoiceEnabled()) {
                            window.FridayVoice.playSpeech(data.response, speakBtn);
                        }
                    } else if (data.error) {
                        appendMessageUI('assistant', `⚠️ ${data.error}`, true);
                    }

                    if (window.FridaySessions) {
                        window.FridaySessions.loadSessions();
                    }

                } catch (err) {
                    removeTypingIndicator();
                    appendMessageUI('assistant', "⚠️ Connection error. Please ensure the server is running.", true);
                } finally {
                    if (userInput) userInput.focus();
                }
            });
        }

        // Prompt suggestion cards click
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (userInput && chatForm) {
                    userInput.value = prompt;
                    userInput.dispatchEvent(new Event('input'));
                    chatForm.dispatchEvent(new Event('submit'));
                }
            });
        });
    }

    return {
        init,
        renderMessages,
        appendMessageUI,
        showTypingIndicator,
        removeTypingIndicator,
        scrollToBottom
    };
})();

window.FridayChat = FridayChat;

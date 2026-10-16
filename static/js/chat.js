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
            appendMessageUI(msg.role, msg.content, false, msg.id);
        });
        scrollToBottom();
    }

    function openShareModal(text) {
        const modal = document.getElementById('share-modal-backdrop');
        const previewEl = document.getElementById('share-preview-text');
        const linkInput = document.getElementById('share-link-input');
        const copyLinkBtn = document.getElementById('share-copy-link-btn');
        const nativeBtn = document.getElementById('share-native-btn');
        const closeBtn = document.getElementById('share-close-btn');
        const doneBtn = document.getElementById('share-done-btn');

        if (!modal) {
            navigator.clipboard.writeText(text);
            if (window.FridayAuth && window.FridayAuth.showToast) {
                window.FridayAuth.showToast('Copied message to clipboard');
            }
            return;
        }

        if (previewEl) previewEl.textContent = text;
        if (linkInput) linkInput.value = text;

        modal.classList.add('active');

        const closeModal = () => {
            modal.classList.remove('active');
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (doneBtn) doneBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        if (copyLinkBtn) {
            copyLinkBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    copyLinkBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Copied!</span>
                    `;
                    if (window.FridayAuth && window.FridayAuth.showToast) {
                        window.FridayAuth.showToast('Prompt copied to clipboard');
                    }
                    setTimeout(() => {
                        copyLinkBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Copy</span>
                        `;
                    }, 2000);
                } catch (e) {
                    console.error('Clipboard copy error:', e);
                }
            };
        }

        if (nativeBtn) {
            if (navigator.share) {
                nativeBtn.style.display = 'flex';
                nativeBtn.onclick = async () => {
                    try {
                        await navigator.share({
                            title: 'Friday AI Prompt',
                            text: text,
                            url: window.location.href
                        });
                    } catch (e) {}
                };
            } else {
                nativeBtn.style.display = 'none';
            }
        }
    }

    function openInlineEditor(userWrapper, row, initialMsgId) {
        const bubbleBox = userWrapper.querySelector('.user-bubble-box');
        const bubble = userWrapper.querySelector('.user-bubble');
        if (!bubbleBox || !bubble) return;

        // Hide regular bubble
        bubbleBox.style.display = 'none';

        // Remove existing edit wrapper if any
        let existingEdit = userWrapper.querySelector('.user-edit-wrapper');
        if (existingEdit) existingEdit.remove();

        const editWrapper = document.createElement('div');
        editWrapper.className = 'user-edit-wrapper';

        const textarea = document.createElement('textarea');
        textarea.className = 'user-edit-textarea';
        textarea.value = bubble.textContent;
        textarea.rows = Math.min(Math.max(bubble.textContent.split('\n').length, 2), 6);

        const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 240) + 'px';
        };

        textarea.addEventListener('input', () => {
            autoResize();
            submitBtn.disabled = textarea.value.trim() === '';
        });

        const footer = document.createElement('div');
        footer.className = 'user-edit-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'edit-btn-cancel';
        cancelBtn.textContent = 'Cancel';

        const closeEditor = () => {
            editWrapper.remove();
            bubbleBox.style.display = 'flex';
        };

        cancelBtn.addEventListener('click', closeEditor);

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'edit-btn-submit';
        submitBtn.innerHTML = `
            <span>Send</span>
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
        `;

        const handleSaveAndSubmit = async () => {
            const newText = textarea.value.trim();
            if (!newText || submitBtn.disabled) return;

            if (newText === bubble.textContent) {
                closeEditor();
                return;
            }

            submitBtn.disabled = true;
            cancelBtn.disabled = true;

            // Update bubble display text and close editor
            bubble.textContent = newText;
            closeEditor();

            // ChatGPT behavior: remove subsequent messages from the conversation view
            let nextSibling = row.nextElementSibling;
            while (nextSibling) {
                const toRemove = nextSibling;
                nextSibling = nextSibling.nextElementSibling;
                toRemove.remove();
            }

            // Show typing indicator
            showTypingIndicator();

            const activeSid = window.FridaySessions ? window.FridaySessions.getActiveSessionId() : null;
            const targetMsgId = row.dataset.msgId || initialMsgId || null;

            try {
                const res = await fetch('/api/chat/edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: activeSid,
                        message_id: targetMsgId,
                        message: newText
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    removeTypingIndicator();
                    if (data.user_message_id) {
                        row.dataset.msgId = data.user_message_id;
                    }
                    if (data.response) {
                        const asstRow = appendMessageUI('assistant', data.response, true, data.assistant_message_id);
                        if (window.FridayVoice && window.FridayVoice.isVoiceEnabled()) {
                            window.FridayVoice.playSpeech(data.response, asstRow?.querySelector('.read-aloud-btn'));
                        }
                    }
                } else {
                    // Fallback to standard chat endpoint if /api/chat/edit is not loaded yet
                    const fbRes = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_id: activeSid,
                            message: newText
                        })
                    });
                    const fbData = await fbRes.json();
                    removeTypingIndicator();
                    if (fbData.user_message_id) {
                        row.dataset.msgId = fbData.user_message_id;
                    }
                    if (fbData.response) {
                        const asstRow = appendMessageUI('assistant', fbData.response, true, fbData.assistant_message_id);
                        if (window.FridayVoice && window.FridayVoice.isVoiceEnabled()) {
                            window.FridayVoice.playSpeech(fbData.response, asstRow?.querySelector('.read-aloud-btn'));
                        }
                    }
                }

                if (window.FridaySessions) {
                    window.FridaySessions.loadSessions();
                }
            } catch (err) {
                removeTypingIndicator();
                appendMessageUI('assistant', '⚠️ Connection error while editing message.', true);
            }
        };

        submitBtn.addEventListener('click', handleSaveAndSubmit);

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeEditor();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                e.preventDefault();
                handleSaveAndSubmit();
            }
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        editWrapper.appendChild(textarea);
        editWrapper.appendChild(footer);

        userWrapper.appendChild(editWrapper);

        setTimeout(() => {
            autoResize();
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 10);
    }

    function appendMessageUI(role, content, shouldScroll = true, msgId = null) {
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (!messagesList) return null;

        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user-row' : 'assistant-row'}`;
        if (msgId) row.dataset.msgId = msgId;

        if (role === 'user') {
            const userWrapper = document.createElement('div');
            userWrapper.className = 'user-message-wrapper';

            const bubbleBox = document.createElement('div');
            bubbleBox.className = 'user-bubble-box';

            const bubble = document.createElement('div');
            bubble.className = 'user-bubble';
            bubble.textContent = content;
            bubbleBox.appendChild(bubble);

            // ChatGPT-style Action Bar: Edit, Copy, Share
            const actionsBar = document.createElement('div');
            actionsBar.className = 'user-actions-bar';

            // 1. Edit Button
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'user-action-btn edit-msg-btn';
            editBtn.title = 'Edit message';
            editBtn.setAttribute('aria-label', 'Edit message');
            editBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit</span>
            `;
            editBtn.addEventListener('click', () => {
                openInlineEditor(userWrapper, row, row.dataset.msgId || msgId);
            });

            // 2. Copy Button
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'user-action-btn copy-msg-btn';
            copyBtn.title = 'Copy message';
            copyBtn.setAttribute('aria-label', 'Copy message');
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
            `;
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(bubble.textContent);
                    copyBtn.classList.add('copied');
                    copyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Copied!</span>
                    `;
                    if (window.FridayAuth && window.FridayAuth.showToast) {
                        window.FridayAuth.showToast('Prompt copied to clipboard');
                    }
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Copy</span>
                        `;
                    }, 2000);
                } catch (err) {
                    console.error('Clipboard copy error:', err);
                }
            });

            // 3. Share Button
            const shareBtn = document.createElement('button');
            shareBtn.type = 'button';
            shareBtn.className = 'user-action-btn share-msg-btn';
            shareBtn.title = 'Share message';
            shareBtn.setAttribute('aria-label', 'Share message');
            shareBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span>Share</span>
            `;
            shareBtn.addEventListener('click', () => {
                openShareModal(bubble.textContent);
            });

            actionsBar.appendChild(editBtn);
            actionsBar.appendChild(copyBtn);
            actionsBar.appendChild(shareBtn);

            bubbleBox.appendChild(actionsBar);
            userWrapper.appendChild(bubbleBox);
            row.appendChild(userWrapper);
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

            // Action buttons (Copy text / Read aloud / Share)
            const actions = document.createElement('div');
            actions.className = 'message-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-action-btn';
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content);
                copyBtn.textContent = 'Copied!';
                if (window.FridayAuth && window.FridayAuth.showToast) {
                    window.FridayAuth.showToast('Copied response to clipboard');
                }
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

            const shareBtn = document.createElement('button');
            shareBtn.className = 'msg-action-btn';
            shareBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share`;
            shareBtn.addEventListener('click', () => {
                openShareModal(content);
            });

            actions.appendChild(copyBtn);
            actions.appendChild(speakBtn);
            actions.appendChild(shareBtn);
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

                const userRow = appendMessageUI('user', message, true);
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

                    if (userRow && data.user_message_id) {
                        userRow.dataset.msgId = data.user_message_id;
                    }

                    if (data.session_id && window.FridaySessions) {
                        window.FridaySessions.setActiveSessionId(data.session_id);
                    }

                    if (data.response) {
                        const assistantRow = appendMessageUI('assistant', data.response, true, data.assistant_message_id);
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

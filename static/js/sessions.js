// ==================== FRIDAY AI - SESSIONS & SIDEBAR MODULE ====================
const FridaySessions = (function() {
    let activeSessionId = null;
    let sessionToDelete = null;

    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const sidebarOpenBtn = document.getElementById('sidebar-open-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');

    const deleteModal = document.getElementById('delete-modal-backdrop');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    const userInput = document.getElementById('user-input');

    const ICON_TRASH = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    function isMobile() {
        return window.innerWidth <= 768;
    }

    function openSidebar() {
        if (!sidebar) return;
        if (isMobile()) {
            sidebar.classList.add('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
        } else {
            sidebar.classList.remove('closed');
        }
    }

    function closeSidebar() {
        if (!sidebar) return;
        if (isMobile()) {
            sidebar.classList.remove('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
        } else {
            sidebar.classList.add('closed');
        }
    }

    async function loadSessions() {
        try {
            const res = await fetch('/api/sessions');
            const sessions = await res.json();
            renderHistoryList(sessions);

            if (!activeSessionId) {
                if (sessions.length > 0) {
                    selectSession(sessions[0].session_id);
                } else {
                    createNewChat();
                }
            }
        } catch (e) {
            console.error('Failed to load sessions:', e);
        }
    }

    function renderHistoryList(sessions) {
        if (!chatHistoryList) return;
        chatHistoryList.innerHTML = '';
        sessions.forEach(sess => {
            const item = document.createElement('div');
            item.className = `history-item ${sess.session_id === activeSessionId ? 'active' : ''}`;
            item.dataset.id = sess.session_id;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-title';
            titleSpan.textContent = sess.title || 'New chat';
            item.appendChild(titleSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-delete-btn';
            deleteBtn.title = 'Delete chat';
            deleteBtn.innerHTML = ICON_TRASH;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteModal(sess.session_id);
            });
            item.appendChild(deleteBtn);

            item.addEventListener('click', () => {
                if (sess.session_id !== activeSessionId) {
                    selectSession(sess.session_id);
                }
                if (isMobile()) closeSidebar();
            });

            chatHistoryList.appendChild(item);
        });
    }

    async function selectSession(sessionId) {
        if (window.FridayVoice) window.FridayVoice.stopSpeaking();
        activeSessionId = sessionId;

        document.querySelectorAll('.history-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === sessionId);
        });

        try {
            const res = await fetch(`/api/sessions/${sessionId}/messages`);
            const messages = await res.json();
            if (window.FridayChat) {
                window.FridayChat.renderMessages(messages);
            }
        } catch (e) {
            console.error('Failed to load messages for session:', e);
        }
    }

    async function createNewChat() {
        if (window.FridayVoice) window.FridayVoice.stopSpeaking();
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New chat' })
            });
            const data = await res.json();
            activeSessionId = data.session_id;
            await loadSessions();
            if (window.FridayChat) {
                window.FridayChat.renderMessages([]);
            }
            if (isMobile()) closeSidebar();
            if (userInput) userInput.focus();
        } catch (e) {
            console.error('Failed to create new chat:', e);
        }
    }

    async function deleteSession(sessionId) {
        try {
            await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
            if (activeSessionId === sessionId) {
                activeSessionId = null;
            }
            await loadSessions();
        } catch (e) {
            console.error('Failed to delete session:', e);
        }
    }

    function openDeleteModal(sessionId) {
        sessionToDelete = sessionId;
        if (deleteModal) deleteModal.classList.add('active');
    }

    function closeDeleteModal() {
        sessionToDelete = null;
        if (deleteModal) deleteModal.classList.remove('active');
    }

    function init() {
        if (sidebarOpenBtn) {
            sidebarOpenBtn.addEventListener('click', () => {
                if (isMobile()) {
                    if (sidebar.classList.contains('open')) {
                        closeSidebar();
                    } else {
                        openSidebar();
                    }
                } else {
                    sidebar.classList.toggle('closed');
                }
            });
        }

        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', closeSidebar);
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', createNewChat);
        }

        if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeDeleteModal);

        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) closeDeleteModal();
            });
        }

        if (modalConfirmBtn) {
            modalConfirmBtn.addEventListener('click', async () => {
                if (sessionToDelete) {
                    const id = sessionToDelete;
                    closeDeleteModal();
                    await deleteSession(id);
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && deleteModal && deleteModal.classList.contains('active')) {
                closeDeleteModal();
            }
        });
    }

    return {
        init,
        loadSessions,
        selectSession,
        createNewChat,
        deleteSession,
        openSidebar,
        closeSidebar,
        getActiveSessionId: () => activeSessionId,
        setActiveSessionId: (id) => { activeSessionId = id; }
    };
})();

window.FridaySessions = FridaySessions;

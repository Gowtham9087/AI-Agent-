// ==================== FRIDAY AI - USER PROFILE & AUTH MODULE ====================
const FridayAuth = (function() {
    const DEFAULT_USER = {
        name: 'Local User',
        email: 'guest@friday.local',
        plan: 'Free • Local',
        avatar: 'U',
        isLoggedIn: false
    };

    let currentUser = { ...DEFAULT_USER };
    let isSignupMode = false;

    // DOM Elements
    const userProfileBtn = document.getElementById('user-profile-btn');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserPlan = document.getElementById('sidebar-user-plan');

    const profilePopover = document.getElementById('profile-popover');
    const popoverUserAvatar = document.getElementById('popover-user-avatar');
    const popoverUserName = document.getElementById('popover-user-name');
    const popoverUserEmail = document.getElementById('popover-user-email');
    const popoverLoginBtn = document.getElementById('popover-login-btn');
    const popoverLoginText = document.getElementById('popover-login-text');
    const popoverSettingsBtn = document.getElementById('popover-settings-btn');
    const popoverLogoutBtn = document.getElementById('popover-logout-btn');

    const authModal = document.getElementById('auth-modal-backdrop');
    const authCloseBtn = document.getElementById('auth-close-btn');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const fieldName = document.getElementById('field-name');
    const authName = document.getElementById('auth-name');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const passwordToggleBtn = document.getElementById('password-toggle-btn');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchText = document.getElementById('auth-switch-text');
    const authSwitchBtn = document.getElementById('auth-switch-btn');
    const socialGoogleBtn = document.getElementById('social-google-btn');
    const socialMsBtn = document.getElementById('social-ms-btn');
    const socialAppleBtn = document.getElementById('social-apple-btn');

    const settingsModal = document.getElementById('settings-modal-backdrop');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const settingsDoneBtn = document.getElementById('settings-done-btn');
    const settingsVoiceToggle = document.getElementById('settings-voice-toggle');
    const settingsAccName = document.getElementById('settings-acc-name');
    const settingsAccEmail = document.getElementById('settings-acc-email');
    const settingsAccPlan = document.getElementById('settings-acc-plan');

    const toastContainer = document.getElementById('toast-container');

    function loadUserProfile() {
        try {
            const saved = localStorage.getItem('friday_user');
            if (saved) {
                currentUser = JSON.parse(saved);
            } else {
                currentUser = { ...DEFAULT_USER };
            }
        } catch (e) {
            currentUser = { ...DEFAULT_USER };
        }
        renderUserProfile();
    }

    function saveUserProfile(user) {
        currentUser = user;
        localStorage.setItem('friday_user', JSON.stringify(user));
        renderUserProfile();
    }

    function renderUserProfile() {
        if (sidebarUserAvatar) sidebarUserAvatar.textContent = currentUser.avatar || 'U';
        if (sidebarUserName) sidebarUserName.textContent = currentUser.name || 'Local User';
        if (sidebarUserPlan) sidebarUserPlan.textContent = currentUser.plan || 'Free • Local';

        if (popoverUserAvatar) popoverUserAvatar.textContent = currentUser.avatar || 'U';
        if (popoverUserName) popoverUserName.textContent = currentUser.name || 'Local User';
        if (popoverUserEmail) popoverUserEmail.textContent = currentUser.email || 'guest@friday.local';
        if (popoverLoginText) {
            popoverLoginText.textContent = currentUser.isLoggedIn ? 'Switch account' : 'Log in / Sign up';
        }

        if (settingsAccName) settingsAccName.textContent = currentUser.name || 'Local User';
        if (settingsAccEmail) settingsAccEmail.textContent = currentUser.email || 'guest@friday.local';
        if (settingsAccPlan) settingsAccPlan.textContent = currentUser.plan || 'Free Plan';
    }

    function showToast(message) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-pill';
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 3000);
    }

    function closeAllPopovers() {
        if (profilePopover) profilePopover.classList.remove('active');
        if (userProfileBtn) userProfileBtn.classList.remove('active');
    }

    function logoutUser() {
        localStorage.removeItem('friday_user');
        currentUser = { ...DEFAULT_USER };
        renderUserProfile();
        showToast('Logged out of Friday');
        setTimeout(() => {
            openAuthModal('login');
        }, 300);
    }

    function openAuthModal(mode = 'login') {
        setAuthMode(mode === 'signup');
        if (authModal) authModal.classList.add('active');
        setTimeout(() => {
            if (authEmail) authEmail.focus();
        }, 100);
    }

    function closeAuthModal() {
        if (authModal) authModal.classList.remove('active');
    }

    function setAuthMode(signup) {
        isSignupMode = signup;
        if (isSignupMode) {
            if (tabLogin) tabLogin.classList.remove('active');
            if (tabSignup) tabSignup.classList.add('active');
            if (authTitle) authTitle.textContent = 'Create your account';
            if (authSubtitle) authSubtitle.textContent = 'Sign up to start chatting with Friday';
            if (fieldName) fieldName.style.display = 'flex';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Create account';
            if (authSwitchText) authSwitchText.textContent = 'Already have an account?';
            if (authSwitchBtn) authSwitchBtn.textContent = 'Log in';
            if (authName) authName.required = true;
        } else {
            if (tabLogin) tabLogin.classList.add('active');
            if (tabSignup) tabSignup.classList.remove('active');
            if (authTitle) authTitle.textContent = 'Welcome back';
            if (authSubtitle) authSubtitle.textContent = 'Log in to Friday to continue your chat';
            if (fieldName) fieldName.style.display = 'none';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Continue';
            if (authSwitchText) authSwitchText.textContent = "Don't have an account?";
            if (authSwitchBtn) authSwitchBtn.textContent = 'Sign up';
            if (authName) authName.required = false;
        }
    }

    function openSettingsModal() {
        if (settingsModal) settingsModal.classList.add('active');
        updateSettingsVoiceBtn();
    }

    function closeSettingsModal() {
        if (settingsModal) settingsModal.classList.remove('active');
    }

    function updateSettingsVoiceBtn() {
        if (settingsVoiceToggle && window.FridayVoice) {
            const enabled = window.FridayVoice.isVoiceEnabled();
            settingsVoiceToggle.textContent = enabled ? 'Voice Enabled (On)' : 'Voice Muted (Off)';
            settingsVoiceToggle.style.color = enabled ? '#10a37f' : '#9e9e9e';
        }
    }

    function init() {
        loadUserProfile();

        // Profile trigger button
        if (userProfileBtn) {
            userProfileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = profilePopover && profilePopover.classList.contains('active');
                if (isOpen) {
                    closeAllPopovers();
                } else {
                    if (profilePopover) profilePopover.classList.add('active');
                    userProfileBtn.classList.add('active');
                }
            });
        }

        // Close popovers on outside click
        document.addEventListener('click', (e) => {
            if (profilePopover && profilePopover.classList.contains('active')) {
                if (!profilePopover.contains(e.target) && !userProfileBtn.contains(e.target)) {
                    closeAllPopovers();
                }
            }
        });

        // Popover items
        if (popoverLoginBtn) {
            popoverLoginBtn.addEventListener('click', () => {
                closeAllPopovers();
                openAuthModal('login');
            });
        }

        if (popoverSettingsBtn) {
            popoverSettingsBtn.addEventListener('click', () => {
                closeAllPopovers();
                openSettingsModal();
            });
        }

        if (popoverLogoutBtn) {
            popoverLogoutBtn.addEventListener('click', () => {
                closeAllPopovers();
                logoutUser();
            });
        }

        // Auth Tabs & Switchers
        if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode(false));
        if (tabSignup) tabSignup.addEventListener('click', () => setAuthMode(true));
        if (authSwitchBtn) authSwitchBtn.addEventListener('click', () => setAuthMode(!isSignupMode));

        if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) closeAuthModal();
            });
        }

        // Password eye visibility toggle
        if (passwordToggleBtn && authPassword) {
            passwordToggleBtn.addEventListener('click', () => {
                const isPassword = authPassword.type === 'password';
                authPassword.type = isPassword ? 'text' : 'password';
                passwordToggleBtn.innerHTML = isPassword
                    ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
                    : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            });
        }

        // Auth Form Submit
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = authEmail.value.trim();
                const password = authPassword.value;
                if (!email || !password) return;

                let displayName = '';
                if (isSignupMode && authName && authName.value.trim()) {
                    displayName = authName.value.trim();
                } else {
                    const prefix = email.split('@')[0];
                    displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                }

                const initial = displayName.charAt(0).toUpperCase() || 'U';

                saveUserProfile({
                    name: displayName,
                    email: email,
                    plan: 'Friday Plus',
                    avatar: initial,
                    isLoggedIn: true
                });

                authForm.reset();
                closeAuthModal();
                showToast(isSignupMode ? `Account created! Welcome, ${displayName} 🎉` : `Welcome back, ${displayName}! 🎉`);
            });
        }

        // Social Logins
        if (socialGoogleBtn) {
            socialGoogleBtn.addEventListener('click', () => {
                saveUserProfile({
                    name: 'Gowtham Govindharaj',
                    email: 'gowtham@gmail.com',
                    plan: 'Friday Plus',
                    avatar: 'G',
                    isLoggedIn: true
                });
                closeAuthModal();
                showToast('Signed in with Google as Gowtham Govindharaj 🎉');
            });
        }

        if (socialMsBtn) {
            socialMsBtn.addEventListener('click', () => {
                saveUserProfile({
                    name: 'Microsoft User',
                    email: 'user@outlook.com',
                    plan: 'Friday Plus',
                    avatar: 'M',
                    isLoggedIn: true
                });
                closeAuthModal();
                showToast('Signed in with Microsoft Account 🎉');
            });
        }

        if (socialAppleBtn) {
            socialAppleBtn.addEventListener('click', () => {
                saveUserProfile({
                    name: 'Apple User',
                    email: 'user@icloud.com',
                    plan: 'Friday Plus',
                    avatar: 'A',
                    isLoggedIn: true
                });
                closeAuthModal();
                showToast('Signed in with Apple ID 🎉');
            });
        }

        // Settings Modal events
        if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettingsModal);
        if (settingsDoneBtn) settingsDoneBtn.addEventListener('click', closeSettingsModal);
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) closeSettingsModal();
            });
        }

        if (settingsVoiceToggle && window.FridayVoice) {
            settingsVoiceToggle.addEventListener('click', () => {
                const nowEnabled = window.FridayVoice.toggleVoice();
                updateSettingsVoiceBtn();
                showToast(nowEnabled ? 'Voice output enabled 🔊' : 'Voice output muted 🔇');
            });
        }

        // Escape Key Handler for Popovers and Modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (authModal && authModal.classList.contains('active')) closeAuthModal();
                if (settingsModal && settingsModal.classList.contains('active')) closeSettingsModal();
                closeAllPopovers();
            }
        });
    }

    return {
        init,
        loadUserProfile,
        saveUserProfile,
        openAuthModal,
        closeAuthModal,
        openSettingsModal,
        closeSettingsModal,
        showToast,
        closeAllPopovers,
        getCurrentUser: () => currentUser
    };
})();

window.FridayAuth = FridayAuth;

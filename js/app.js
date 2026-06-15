class FaithFastApp {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'dashboard';
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.bindGlobalEvents();
        this.loadInitialData();
        this.initializeCurrentTab();
        this.initPWA();
        this.bindEvents();
        this.setupNavScrollIndicators();
        this.setupUserMenu();
        this.setupNotificationMenu();
    }

    setupUserMenu() {
        const toggle = document.getElementById('userMenuToggle');
        const dropdown = document.getElementById('userMenuDropdown');
        if (!toggle || !dropdown) return;

        const closeMenu = () => {
            toggle.classList.remove('open');
            dropdown.classList.remove('show');
        };

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('show');
            toggle.classList.toggle('open', isOpen);
        });

        dropdown.addEventListener('click', () => closeMenu());

        document.addEventListener('click', (e) => {
            if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
    }

    setupNotificationMenu() {
        const toggle = document.getElementById('notificationToggle');
        const dropdown = document.getElementById('notificationDropdown');
        if (!toggle || !dropdown) return;

        const closeMenu = () => {
            toggle.classList.remove('open');
            dropdown.classList.remove('show');
        };

        toggle.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('show');
            toggle.classList.toggle('open', isOpen);
            if (isOpen) {
                await this.loadNotificationList();
            }
        });

        document.addEventListener('click', (e) => {
            if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });

        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.apiCall('notifications/mark-read.php', 'POST', { all: true });
                await this.loadNotificationList();
                await this.loadNotificationCount();
            });
        }

        // Periodic refresh of the unread badge
        setInterval(() => this.loadNotificationCount(), 60000);
    }

    async loadNotificationList() {
        try {
            const response = await this.apiCall('notifications/list.php');
            if (response.success) {
                this.renderNotificationList(response.notifications || []);
            }
        } catch (error) {
            console.error('Error loading notification list:', error);
        }
    }

    renderNotificationList(notifications) {
        const list = document.getElementById('notificationList');
        if (!list) return;

        const localNotifications = this.getLocalFastingNotifications();
        const merged = [...localNotifications, ...notifications]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (merged.length === 0) {
            list.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
            return;
        }

        list.innerHTML = merged.map(n => {
            const icon = this.getNotificationTypeIcon(n.type);
            const timeAgo = this.getTimeAgo(new Date(n.created_at));
            const unreadClass = !n.is_read ? 'unread' : '';
            const isLocal = n.local ? '1' : '0';
            return `
                <div class="notification-item ${unreadClass}" data-id="${n.id}" data-tab="${n.link_tab || ''}" data-local="${isLocal}">
                    <div class="notification-item-icon"><i class="fas fa-${icon}"></i></div>
                    <div class="notification-item-content">
                        <p class="notification-item-title">${n.title}</p>
                        ${n.message ? `<p class="notification-item-message">${n.message}</p>` : ''}
                        <div class="notification-item-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const tab = item.dataset.tab;
                const isLocal = item.dataset.local === '1';

                if (isLocal) {
                    this.dismissLocalFastingNotification(id);
                } else {
                    await this.apiCall('notifications/mark-read.php', 'POST', { id });
                    await this.loadNotificationCount();
                    item.classList.remove('unread');
                }

                if (tab) this.switchTab(tab);
            });
        });
    }

    getNotificationTypeIcon(type) {
        const icons = {
            prayer_answered: 'praying-hands',
            join_approved: 'user-check',
            join_rejected: 'user-times',
            join_request: 'user-plus',
            direct_message: 'envelope',
            fasting_reminder: 'clock'
        };
        return icons[type] || 'bell';
    }

    getLocalFastingNotifications() {
        return (typeof FastingReminders !== 'undefined') ? FastingReminders.getAll() : [];
    }

    dismissLocalFastingNotification(id) {
        if (typeof FastingReminders !== 'undefined') {
            FastingReminders.dismiss(id);
        }
        this.refreshNotificationBadgeWithLocal();
        this.loadNotificationList();
    }

    refreshNotificationBadgeWithLocal() {
        return this.apiCall('notifications/count.php').then(response => {
            const serverCount = response.count || 0;
            const localCount = (typeof FastingReminders !== 'undefined') ? FastingReminders.unreadCount() : 0;
            this.updateNotificationBadge(serverCount + localCount);
        }).catch(() => {
            const localCount = (typeof FastingReminders !== 'undefined') ? FastingReminders.unreadCount() : 0;
            this.updateNotificationBadge(localCount);
        });
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    setupNavScrollIndicators() {
        const navTabs = document.querySelector('.nav-tabs');
        const fadeLeft = document.querySelector('.nav-fade-left');
        const fadeRight = document.querySelector('.nav-fade-right');
        if (!navTabs || !fadeLeft || !fadeRight) return;

        const updateFades = () => {
            const maxScroll = navTabs.scrollWidth - navTabs.clientWidth;
            fadeLeft.classList.toggle('is-visible', navTabs.scrollLeft > 4);
            fadeRight.classList.toggle('is-visible', navTabs.scrollLeft < maxScroll - 4);
        };

        navTabs.addEventListener('scroll', updateFades);
        window.addEventListener('resize', updateFades);
        updateFades();
    }

    checkAuthentication() {
        if (!AuthHelper.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = AuthHelper.getUser();
        this.updateUIForUser();
        this.checkSubscriptionGate();
    }

    checkSubscriptionGate() {
        if (!this.currentUser) return;

        const subscription = this.currentUser.subscription || 'free';

        if (subscription === 'trial' && this.isTrialExpired()) {
            this.showTrialExpiredModal();
            return;
        }

        if (subscription === 'premium') {
            this.showCheckoutModal();
        }
    }

    isTrialExpired() {
        if (!this.currentUser || !this.currentUser.created_at) return false;

        const createdAt = new Date(this.currentUser.created_at.replace(' ', 'T'));
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        return (Date.now() - createdAt.getTime()) >= sevenDays;
    }

    showTrialExpiredModal() {
        const modalEl = document.getElementById('trialExpiredModal');
        if (!modalEl) return;

        this.subscriptionGateActive = true;

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
            backdrop: 'static',
            keyboard: false
        });
        modal.show();
        this.elevateGateBackdrop();

        if (!modalEl.dataset.bound) {
            modalEl.dataset.bound = 'true';

            const continueFreeBtn = document.getElementById('continueFreeBtn');
            if (continueFreeBtn) {
                continueFreeBtn.addEventListener('click', () => this.downgradeToFree('trialExpiredModal', continueFreeBtn, 'Continue with Free Plan'));
            }

            const upgradePremiumBtn = document.getElementById('upgradePremiumBtn');
            if (upgradePremiumBtn) {
                upgradePremiumBtn.addEventListener('click', () => this.showCheckoutModal());
            }

            const trialLogoutBtn = document.getElementById('trialLogoutBtn');
            if (trialLogoutBtn) {
                trialLogoutBtn.addEventListener('click', () => this.logout());
            }
        }
    }

    async downgradeToFree(modalId, triggerBtn, triggerLabel) {
        const modalEl = document.getElementById(modalId);
        const errorEl = modalEl ? modalEl.querySelector('.subscription-modal-error') : null;
        const buttons = modalEl ? modalEl.querySelectorAll('.modal-footer button, .d-grid button') : [];

        if (errorEl) errorEl.style.display = 'none';
        buttons.forEach(btn => btn.disabled = true);
        if (triggerBtn) {
            triggerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        }

        try {
            const response = await AuthHelper.apiCall('profile/update.php', 'PUT', { subscription: 'free' });

            if (response && response.success) {
                AuthHelper.setAuthData(AuthHelper.getToken(), response.user);

                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                window.location.reload();
            } else {
                throw new Error((response && response.message) || 'Failed to update subscription');
            }
        } catch (error) {
            console.error('Downgrade to free failed:', error);
            if (errorEl) {
                errorEl.textContent = 'Something went wrong. Please try again.';
                errorEl.style.display = 'block';
            }
            buttons.forEach(btn => btn.disabled = false);
            if (triggerBtn) {
                triggerBtn.innerHTML = triggerLabel;
            }
        }
    }

    showCheckoutModal() {
        const modalEl = document.getElementById('checkoutModal');
        if (!modalEl) return;

        this.subscriptionGateActive = true;

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
            backdrop: 'static',
            keyboard: false
        });
        modal.show();
        this.elevateGateBackdrop();

        if (!modalEl.dataset.bound) {
            modalEl.dataset.bound = 'true';

            const payNowBtn = document.getElementById('payNowBtn');
            if (payNowBtn) {
                payNowBtn.addEventListener('click', () => {
                    const msg = document.getElementById('payComingSoonMsg');
                    if (msg) msg.style.display = 'block';
                });
            }

            const switchToFreeBtn = document.getElementById('switchToFreeBtn');
            if (switchToFreeBtn) {
                switchToFreeBtn.addEventListener('click', () => this.downgradeToFree('checkoutModal', switchToFreeBtn, 'Switch to Free Plan'));
            }

            const checkoutLogoutBtn = document.getElementById('checkoutLogoutBtn');
            if (checkoutLogoutBtn) {
                checkoutLogoutBtn.addEventListener('click', () => this.logout());
            }
        }
    }

    elevateGateBackdrop() {
        // Push the most recently created Bootstrap backdrop above any other
        // fixed-position UI (e.g. the PWA install prompt at z-index 10000)
        // so the subscription gate truly blocks the whole app.
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const backdrop = backdrops[backdrops.length - 1];
        if (backdrop) backdrop.style.zIndex = '10590';
    }

    bindGlobalEvents() {
        // Global logout
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
                e.preventDefault();
                this.logout();
            }
        });

        // Global tab navigation
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('[data-tab]');
            if (tabBtn) {
                e.preventDefault();
                this.switchTab(tabBtn.dataset.tab);
            }
        });

        // Global modal handling
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || 
                e.target.classList.contains('close-modal') ||
                e.target.closest('.close-modal')) {
                this.hideAllModals();
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            this.handleRouteChange();
        });

        // Error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showGlobalNotification('An unexpected error occurred', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.showGlobalNotification('An operation failed', 'error');
        });

        // PWA Install Prompt
        this.setupBeforeInstallPrompt();
    }

    setupBeforeInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('🎯 beforeinstallprompt event fired');
            e.preventDefault();
            window.deferredPrompt = e;
            
            // Check if we should show the modal (after 24 hours if not installed)
            setTimeout(() => {
                if (this.shouldShowInstallModal()) {
                    this.showInstallModal();
                }
            }, 3000); // Show after 3 seconds initially
        });

        // Also check on app load if we should show the modal
        setTimeout(() => {
            if (this.shouldShowInstallModal() && window.deferredPrompt) {
                this.showInstallModal();
            }
        }, 5000);
    }

    initializeCurrentTab() {
        // Get current tab from URL or default to dashboard
        const hash = window.location.hash.replace('#', '');
        const validTabs = ['dashboard', 'fasting', 'journal', 'prayers', 'chat', 'groups', 'bible', 'resources', 'profile'];
        
        if (validTabs.includes(hash)) {
            this.currentTab = hash;
        }
        
        this.switchTab(this.currentTab);
    }

    initPWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }

        // Listen for app installed event
        window.addEventListener('appinstalled', (evt) => {
            console.log('App was installed successfully');
            this.setInstallationDate();
            this.trackEvent('pwa_installed');
        });
    }

    switchTab(tabName) {
        console.log('🚀 Switching to tab:', tabName);
        
        // Validate tab name
        const validTabs = ['dashboard', 'fasting', 'journal', 'prayers', 'chat', 'groups', 'bible', 'resources', 'profile'];
        if (!validTabs.includes(tabName)) {
            console.error('Invalid tab name:', tabName);
            tabName = 'dashboard';
        }
        
        // Update current tab
        this.currentTab = tabName;
        window.history.pushState(null, '', `#${tabName}`);
        
        // Update navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeNavTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        if (activeNavTab) {
            activeNavTab.classList.add('active');
            activeNavTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        // HIDE ALL TAB CONTENTS AGGRESSIVELY
        this.hideAllTabsCompletely();
        
        // SHOW ONLY THE ACTIVE TAB
        this.showActiveTabOnly(tabName);

        // Initialize the tab-specific functionality
        setTimeout(() => {
            this.initializeTab(tabName);
        }, 50);
    }
    
    hideAllTabsCompletely() {
        const allTabs = document.querySelectorAll('.tab-content');
        console.log(`🔴 Hiding ${allTabs.length} tabs`);
        
        allTabs.forEach(tab => {
            // Remove active class
            tab.classList.remove('active');
            
            // Apply multiple hiding techniques
            tab.style.display = 'none';
            tab.style.visibility = 'hidden';
            tab.style.opacity = '0';
            tab.style.height = '0';
            tab.style.overflow = 'hidden';
            tab.style.position = 'absolute';
            tab.style.left = '-9999px';
            tab.style.top = '-9999px';
            tab.style.zIndex = '-1000';
            tab.style.pointerEvents = 'none';
            tab.setAttribute('aria-hidden', 'true');
            tab.setAttribute('hidden', 'true');
            
            // Also hide all children recursively
            this.hideAllChildren(tab);
        });
    }

    hideAllChildren(element) {
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            child.style.display = 'none';
            child.style.visibility = 'hidden';
            this.hideAllChildren(child);
        }
    }
    
    showActiveTabOnly(tabName) {
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            // Remove all hiding attributes and styles
            activeContent.removeAttribute('hidden');
            activeContent.removeAttribute('aria-hidden');
            
            // Reset all styles
            activeContent.style.display = 'block';
            activeContent.style.visibility = 'visible';
            activeContent.style.opacity = '1';
            activeContent.style.height = 'auto';
            activeContent.style.overflow = 'visible';
            activeContent.style.position = 'static';
            activeContent.style.left = 'auto';
            activeContent.style.top = 'auto';
            activeContent.style.zIndex = 'auto';
            activeContent.style.pointerEvents = 'auto';
            
            activeContent.classList.add('active');
            
            // Show all children recursively
            this.showAllChildren(activeContent);
            
            console.log(`✅ Tab ${tabName} is now visible`);
        } else {
            console.error(`❌ Tab content not found: ${tabName}-tab`);
        }
    }
    
    showAllChildren(element) {
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            child.style.display = '';
            child.style.visibility = '';
            this.showAllChildren(child);
        }
    }

    initializeTab(tabName) {
        console.log('Initializing tab:', tabName);
        
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            try {
                
                this.cleanupPreviousTab();

                switch(tabName) {
                    case 'dashboard':
                        if (typeof Dashboard !== 'undefined') {
                            window.dashboard = new Dashboard();
                            window.dashboard.init().then(() => {
                                console.log('✅ Dashboard initialized successfully');
                            }).catch(error => {
                                console.error('❌ Dashboard initialization failed:', error);
                                this.showGlobalNotification('❌ Error loading dashboard', 'error');
                            });
                        } else {
                            console.error('❌ Dashboard class not found');
                            this.showGlobalNotification('❌ Dashboard module not loaded', 'error');
                        }
                        break;
                    case 'fasting':
                        if (typeof Fasting !== 'undefined') {
                            this.fasting = new Fasting();
                            // The Fasting tab's rendered HTML uses inline
                            // onclick="fastingApp...." handlers, so the global
                            // reference must point at the instance that actually
                            // loaded the data and rendered the markup.
                            window.fastingApp = this.fasting;
                            this.fasting.init().catch(error => {
                                console.error('❌ Fasting initialization failed:', error);
                            });
                        }
                        break;
                    case 'journal':
                        if (typeof Journal !== 'undefined') {
                            this.journal = new Journal();
                            this.journal.init().catch(error => {
                                console.error('❌ Journal initialization failed:', error);
                            });
                        }
                        break;
                    case 'prayers':
                        if (typeof Prayers !== 'undefined') {
                            this.prayers = new Prayers();
                            this.prayers.init().catch(error => {
                                console.error('❌ Prayers initialization failed:', error);
                            });
                        }
                        break;
                    case 'chat':
                        if (typeof Chat !== 'undefined') {
                            // Reuse the single global chat instance (also used by
                            // js/chat.js for input/emoji/mention bindings) so chat
                            // state like users and mentionCandidates stays in sync.
                            if (!window.chatInstance) {
                                window.chatInstance = new Chat();
                            }
                            this.chat = window.chatInstance;
                            this.chat.init().catch(error => {
                                console.error('❌ Chat initialization failed:', error);
                            });
                        }
                        break;
                    case 'groups':
                        if (typeof Groups !== 'undefined') {
                            this.groups = new Groups();
                            this.groups.init().catch(error => {
                                console.error('❌ Groups initialization failed:', error);
                            });
                        }
                        break;
                    case 'bible':
                        if (typeof Bible !== 'undefined') {
                            this.bible = new Bible();
                            this.bible.init().catch(error => {
                                console.error('❌ Bible initialization failed:', error);
                            });
                        }
                        break;
                    case 'resources':
                        if (typeof Resources !== 'undefined') {
                            this.resources = new Resources();
                            this.resources.init().catch(error => {
                                console.error('❌ Resources initialization failed:', error);
                            });
                        }
                        break;
                    case 'profile':
                        if (typeof Profile !== 'undefined') {
                            this.profile = new Profile();
                            this.profile.init().catch(error => {
                                console.error('❌ Profile initialization failed:', error);
                            });
                        }
                        break;
                }
            } catch (error) {
                console.error(`❌ Error initializing ${tabName}:`, error);
                this.showGlobalNotification(`❌ Error loading ${tabName}`, 'error');
            }
        }, 100);
    }
    
    cleanupPreviousTab() {
        // Clean up previous tab instances
        if (this.fasting && this.currentTab !== 'fasting') {
            this.fasting.cleanup && this.fasting.cleanup();
        }
        if (this.journal && this.currentTab !== 'journal') {
            this.journal.cleanup && this.journal.cleanup();
        }
        // Add cleanup for other tabs...
    }
    
    handleRouteChange() {
        const hash = window.location.hash.replace('#', '');
        if (hash && hash !== this.currentTab) {
            this.switchTab(hash);
        }
    }
    
    ensureOnlyActiveTabVisible(tabName) {
        // One more pass to ensure only the active tab is visible
        document.querySelectorAll('.tab-content').forEach(tab => {
            const isActiveTab = tab.id === `${tabName}-tab`;
            
            if (isActiveTab) {
                tab.style.display = 'block';
                tab.style.visibility = 'visible';
                tab.classList.add('active');
            } else {
                tab.style.display = 'none';
                tab.style.visibility = 'hidden';
                tab.classList.remove('active');
            }
        });
    }

    updateUIForUser() {
        if (!this.currentUser) return;

        // Update user info in header
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const welcomeName = document.getElementById('welcomeName');
        
        if (userAvatar) userAvatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
        if (userName) userName.textContent = this.currentUser.name;
        if (welcomeName) welcomeName.textContent = this.currentUser.name;

        // Update based on user role and subscription
        this.updateSubscriptionFeatures();
    }

    updateSubscriptionFeatures() {
        const subscription = this.currentUser?.subscription || 'free';
        const elements = document.querySelectorAll('.premium-feature');
        
        elements.forEach(element => {
            if (subscription === 'free') {
                element.style.opacity = '0.6';
                element.style.pointerEvents = 'none';
                element.title = 'Premium feature - upgrade to access';
            } else {
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
                element.removeAttribute('title');
            }
        });
    }

    async logout() {
        if (confirm('Are you sure you want to log out?')) {
            try {
                await AuthHelper.apiCall('auth/logout.php', 'POST');
            } catch (error) {
                console.error('Logout API error:', error);
            } finally {
                AuthHelper.clearAuthData();
                window.location.href = 'index.html';
            }
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        return await AuthHelper.apiCall(endpoint, method, data);
    }

    hideAllModals() {
        console.log('Hiding all modals');
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
    }

    async loadInitialData() {
        try {
            // Load essential data needed across the app
            await this.loadUserPreferences();
            await this.loadNotificationCount();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadUserPreferences() {
        try {
            const response = await this.apiCall('user/preferences.php');
            if (response.success) {
                this.applyUserPreferences(response.preferences);
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }

    applyUserPreferences(preferences) {
        if (preferences.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    async loadNotificationCount() {
        try {
            await this.refreshNotificationBadgeWithLocal();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count > 0 ? count : '';
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    showGlobalNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        document.querySelectorAll('.global-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `global-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="close-notification">&times;</button>
            </div>
        `;

        // Add styles for notification
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .global-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    z-index: 10000;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                    max-width: 300px;
                }
                .global-notification.show {
                    transform: translateX(0);
                }
                .notification-content {
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .global-notification.success {
                    border-left: 4px solid var(--success);
                }
                .global-notification.error {
                    border-left: 4px solid var(--error);
                }
                .global-notification.warning {
                    border-left: 4px solid var(--warning);
                }
                .close-notification {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    margin-left: auto;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto remove
        const timeout = setTimeout(() => {
            this.removeNotification(notification);
        }, duration);

        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            clearTimeout(timeout);
            this.removeNotification(notification);
        });
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ===== PWA INSTALL MODAL METHODS =====
    showInstallButton() {
        // This method is kept for compatibility but now uses modal
        this.showInstallModal();
    }

    showInstallModal() {
        // Don't compete with the subscription gate - it must stay the only
        // thing the user can interact with.
        if (this.subscriptionGateActive) {
            return;
        }

        // Install prompt is mobile-only, and shouldn't show if already
        // installed or running as PWA
        if (!isMobileDevice() || this.isRunningStandalone() || this.isAppInstalled()) {
            return;
        }

        // Remove existing modal if any
        const existingModal = document.getElementById('pwa-install-modal');
        if (existingModal) existingModal.remove();

        // Create install modal
        const modal = document.createElement('div');
        modal.id = 'pwa-install-modal';
        modal.className = 'pwa-install-modal';

        modal.innerHTML = `
            <div class="pwa-modal-header">
                <h4><i class="fas fa-download"></i> Install ${(window.APP_BRANDING && window.APP_BRANDING.appName) || 'Faith Fast'}</h4>
                <button class="pwa-close-btn" id="pwaCloseBtn">&times;</button>
            </div>
            <div class="pwa-modal-body">
                <p>Install our app for a better experience:</p>
                <ul>
                    <li><i class="fas fa-bolt"></i> Faster loading</li>
                    <li><i class="fas fa-wifi"></i> Works offline</li>
                    <li><i class="fas fa-mobile-alt"></i> App-like experience</li>
                </ul>
            </div>
            <div class="pwa-modal-footer">
                <button class="btn btn-secondary btn-sm" id="pwaDismissBtn">Not Now</button>
                <button class="btn btn-primary btn-sm" id="pwaInstallBtn">
                    <i class="fas fa-download"></i> Install
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('pwaCloseBtn').addEventListener('click', () => {
            this.hideInstallModal();
            this.setDismissedState();
        });

        document.getElementById('pwaDismissBtn').addEventListener('click', () => {
            this.hideInstallModal();
            this.setDismissedState();
        });

        document.getElementById('pwaInstallBtn').addEventListener('click', () => {
            this.forceInstallPrompt();
        });

        // Auto-hide after 60 seconds
        setTimeout(() => {
            if (document.getElementById('pwa-install-modal')) {
                this.hideInstallModal();
                this.setDismissedState();
            }
        }, 60000);
    }

    hideInstallModal() {
        const modal = document.getElementById('pwa-install-modal');
        if (modal) {
            modal.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    setDismissedState() {
        //const dismissedUntil = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours from now
        //localStorage.setItem('pwaInstallDismissed', dismissedUntil.toString());
		localStorage.removeItem('pwaInstallDismissed');
    }

    setInstallationDate() {
        localStorage.setItem('pwaInstalled', new Date().getTime().toString());
    }

    isAppInstalled() {
        return localStorage.getItem('pwaInstalled') !== null;
    }

    shouldShowInstallModal() {
        // Install prompt is mobile-only
        if (!isMobileDevice()) {
            return false;
        }

        // Don't show if already installed
        if (this.isAppInstalled() || this.isRunningStandalone()) {
            return false;
        }

        // Check if user dismissed the modal
        const dismissedUntil = localStorage.getItem('pwaInstallDismissed');
        if (dismissedUntil) {
            const now = new Date().getTime();
            const dismissedTime = parseInt(dismissedUntil);
            
            // If dismissal period hasn't expired, don't show
            if (now < dismissedTime) {
                return false;
            } else {
                // Dismissal period expired, clear it
                localStorage.removeItem('pwaInstallDismissed');
            }
        }

        // Show if we have the install prompt available
        return !!window.deferredPrompt;
    }

    isRunningStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone;
    }

    forceInstallPrompt() {
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            window.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted install');
                    this.setInstallationDate();
                } else {
                    console.log('User dismissed install');
                    this.setDismissedState(); // Treat as dismissal for 24 hours
                }
                window.deferredPrompt = null;
            });
        } else {
            console.log('Install prompt not available');
        }
    }

    bindEvents() {
        // Add any additional event bindings here
    }

    checkAuthStatus() {
        // This method can be removed as it's redundant with checkAuthentication
    }

    trackEvent(eventName) {
        // Add analytics tracking if needed
        console.log(`Event tracked: ${eventName}`);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FaithFastApp();
    
    // Initialize Bible if it exists
    if (typeof Bible !== 'undefined') {
        window.bible = new Bible();
        // Show welcome message initially
        window.bible.showWelcomeMessage();
    }
    
    // REMOVED the problematic addInstallButton call
});
// Enhanced install button management
class PWAInstallUI {
    constructor() {
        this.installButton = null;
        this.init();
    }

    init() {
        this.createInstallButton();
        this.setupEventListeners();
    }

    createInstallButton() {
        // Remove existing button
        const existingBtn = document.getElementById('pwa-install-button');
        if (existingBtn) existingBtn.remove();

        // Create new button (hidden by default)
        this.installButton = document.createElement('button');
        this.installButton.id = 'pwa-install-button';
        this.installButton.className = 'btn btn-outline-primary btn-sm';
        this.installButton.innerHTML = '<i class="fas fa-download"></i> Install App';
        this.installButton.style.marginLeft = '10px';
        this.installButton.style.display = 'none';

        this.installButton.addEventListener('click', () => {
            this.showInstallPrompt();
        });

        this.addButtonToUI();
    }

    addButtonToUI() {
        // Try to add to dashboard header first
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            headerActions.appendChild(this.installButton);
            console.log('Install button added to dashboard header');
            return;
        }

        // Fallback to login page
        const authCard = document.querySelector('.auth-card');
        if (authCard) {
            this.installButton.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                margin: 0;
            `;
            document.body.appendChild(this.installButton);
            console.log('Install button added to login page');
            return;
        }

        // Final fallback - fixed position
        this.installButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            margin: 0;
        `;
        document.body.appendChild(this.installButton);
        console.log('Install button added with fixed position');
    }

    showInstallButton() {
        if (this.installButton && window.deferredPrompt && !this.isRunningStandalone()) {
            this.installButton.style.display = 'block';
            console.log('Install button shown');
        }
    }

    hideInstallButton() {
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }
    }

    async showInstallPrompt() {
        if (!window.deferredPrompt) {
            console.log('No install prompt available');
            this.showManualInstructions();
            return;
        }

        try {
            console.log('Showing install prompt...');
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);

            if (outcome === 'accepted') {
                this.hideInstallButton();
                this.trackInstallation();
            }

            window.deferredPrompt = null;
        } catch (error) {
            console.error('Error showing install prompt:', error);
        }
    }

    isRunningStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone;
    }

    showManualInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        if (isIOS) {
            alert('To install this app:\n1. Tap the Share button 📱\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right');
        } else if (isAndroid) {
            alert('To install this app:\n1. Tap the menu button (⋮)\n2. Tap "Add to Home screen"\n3. Tap "Add" to confirm');
        } else {
            alert('To install this app:\nLook for the install icon (📥) in the address bar or browser menu');
        }
    }

    setupEventListeners() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('🎯 beforeinstallprompt event fired');
            e.preventDefault();
            window.deferredPrompt = e;

            // ✅ Delegate to app.js modal if available
            if (window.app && typeof window.app.showInstallModal === 'function') {
                window.app.showInstallModal();
            } else {
                console.warn('⚠️ App modal not available, showing fallback button');
                this.showInstallButton();
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('🎉 App installed successfully');
            window.deferredPrompt = null;

            // ✅ Close modal if app.js is handling it
            if (window.app && typeof window.app.hideInstallModal === 'function') {
                window.app.hideInstallModal();
            } else {
                this.hideInstallButton();
            }
        });
    }

    trackInstallation() {
        // You can add analytics here
        console.log('App installation completed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.pwaInstallUI = new PWAInstallUI();

    // Debug: Check if button was placed correctly
    setTimeout(() => {
        const button = document.getElementById('pwa-install-button');
        if (button) {
            console.log('✅ Install button is in DOM');
        } else {
            console.log('❌ Install button not found in DOM');
        }
    }, 2000);
});

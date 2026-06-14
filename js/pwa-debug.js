// PWA Debug Helper
function checkPWAReadiness() {
    const checks = {
        'HTTPS': window.location.protocol === 'https:',
        'Service Worker': 'serviceWorker' in navigator,
        'Manifest': document.querySelector('link[rel="manifest"]') !== null,
        'Icons': document.querySelector('link[rel="icon"]') !== null || document.querySelector('link[rel="apple-touch-icon"]') !== null,
        'Themes': document.querySelector('meta[name="theme-color"]') !== null,
        'Viewport': document.querySelector('meta[name="viewport"]') !== null,
        'Standalone Capable': document.querySelector('meta[name="apple-mobile-web-app-capable"]') !== null
    };

    console.log('=== PWA Readiness Check ===');
    Object.entries(checks).forEach(([feature, supported]) => {
        console.log(`${feature}: ${supported ? '✅' : '❌'}`);
    });

    // Check manifest specifically
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
        fetch(manifestLink.href)
            .then(response => response.json())
            .then(manifest => {
                console.log('Manifest loaded successfully:', manifest);
                checkManifestRequirements(manifest);
            })
            .catch(error => {
                console.error('Failed to load manifest:', error);
            });
    }

    // Check if app meets install criteria
    checkInstallCriteria();
}

function checkManifestRequirements(manifest) {
    const requirements = {
        'name': !!manifest.name,
        'short_name': !!manifest.short_name,
        'start_url': !!manifest.start_url,
        'display': manifest.display && ['fullscreen', 'standalone', 'minimal-ui'].includes(manifest.display),
        'icons': manifest.icons && manifest.icons.length > 0,
        'icons_include_192': manifest.icons && manifest.icons.some(icon => icon.sizes === '192x192' || icon.sizes === '192x192'),
        'icons_include_512': manifest.icons && manifest.icons.some(icon => icon.sizes === '512x512' || icon.sizes === '512x512')
    };

    console.log('=== Manifest Requirements ===');
    Object.entries(requirements).forEach(([requirement, met]) => {
        console.log(`${requirement}: ${met ? '✅' : '❌'}`);
    });
}

function checkInstallCriteria() {
    // Check if we're already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ App is already installed and running in standalone mode');
        return;
    }

    // Check if beforeinstallprompt has been fired
    if (window.deferredPrompt) {
        console.log('✅ Install prompt is available (deferredPrompt exists)');
    } else {
        console.log('❌ Install prompt not yet available');
    }
}

// Enhanced PWA installation with more aggressive prompting
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
        this.init();
    }

    init() {
        this.setupBeforeInstallPrompt();
        this.setupAppInstalled();
        this.detectInstallable();
        this.createInstallButton();
    }

    setupBeforeInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('🎯 beforeinstallprompt event fired');
            e.preventDefault();
            this.deferredPrompt = e;
            window.deferredPrompt = e; // Make it globally available
            
            // Show install button
            this.showInstallButton();
            
            // Auto-show prompt after delay (optional)
            setTimeout(() => {
                this.showInstallPrompt();
            }, 3000);
        });
    }

    setupAppInstalled() {
        window.addEventListener('appinstalled', (evt) => {
            console.log('🎉 App was successfully installed');
            this.hideInstallButton();
            this.deferredPrompt = null;
        });
    }

    detectInstallable() {
        // Check if app is eligible for installation
        const isEligible = this.deferredPrompt !== null;
        console.log('📱 Install eligibility:', isEligible);
        
        if (isEligible) {
            this.showInstallButton();
        }
    }

    createInstallButton() {
        // Remove existing install button if any
        const existingBtn = document.getElementById('pwa-install-button');
        if (existingBtn) existingBtn.remove();

        // Create install button
        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-button';
        installBtn.innerHTML = `
            <i class="fas fa-download"></i>
            Install App
        `;
        installBtn.className = 'btn btn-primary';
        installBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
        `;
        
        installBtn.addEventListener('click', () => this.showInstallPrompt());
        
        document.body.appendChild(installBtn);
    }

    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-button');
        if (installBtn && this.deferredPrompt && !this.isRunningStandalone()) {
            installBtn.style.display = 'block';
        }
    }

    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-button');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    async showInstallPrompt() {
        if (!this.deferredPrompt) {
            console.log('No deferred prompt available');
            return;
        }

        try {
            console.log('Showing install prompt...');
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            
            if (outcome === 'accepted') {
                this.hideInstallButton();
            }
            
            this.deferredPrompt = null;
        } catch (error) {
            console.error('Error showing install prompt:', error);
        }
    }

    isRunningStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone ||
               document.referrer.includes('android-app://');
    }

    showManualInstallInstructions() {
        if (this.isIOS) {
            this.showIOSInstructions();
        } else if (this.isAndroid) {
            this.showAndroidInstructions();
        } else {
            this.showDesktopInstructions();
        }
    }

    showIOSInstructions() {
        alert('To install this app:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right');
    }

    showAndroidInstructions() {
        alert('To install this app:\n1. Tap the menu button (⋮)\n2. Tap "Add to Home screen"\n3. Tap "Add" to confirm');
    }

    showDesktopInstructions() {
        alert('To install this app:\nLook for the install icon in the address bar or browser menu');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Run debug checks
    checkPWAReadiness();
    
    // Initialize PWA installer
    window.pwaInstaller = new PWAInstaller();
    
    // Add debug button for testing (remove in production)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'PWA Debug';
        debugBtn.style.cssText = 'position:fixed;top:10px;left:10px;z-index:10000;background:red;color:white;border:none;padding:5px;';
        debugBtn.onclick = checkPWAReadiness;
        document.body.appendChild(debugBtn);
    }
});

// Export for global access
window.checkPWAReadiness = checkPWAReadiness;
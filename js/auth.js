class Auth {
    constructor() {
        this.currentForm = 'login';
        this.scriptureIndex = 0;
        this.scriptureInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.showForm('login');
        this.checkExistingSession();
        this.hideWelcomeModal();
    }

    checkExistingSession() {
        if (AuthHelper.isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }
    }

    bindEvents() {
        console.log('Binding auth events...');
        
        // Form switching
        this.bindFormSwitching();
        
        // Form submissions
        this.bindFormSubmissions();
        
        // Scripture modal
        this.bindScriptureModal();
    }

    bindFormSwitching() {
        // Show register form
        const showRegisterLinks = document.querySelectorAll('.show-register');
        showRegisterLinks.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForm('register');
            });
        });

        // Show login form
        const showLoginLinks = document.querySelectorAll('.show-login');
        showLoginLinks.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForm('login');
            });
        });

        // Show forgot password form
        const showForgotLinks = document.querySelectorAll('.show-forgot');
        showForgotLinks.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForm('forgot');
            });
        });
    }

    bindFormSubmissions() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Registration form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgotPasswordForm');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }
    }

    bindScriptureModal() {
        const proceedBtn = document.getElementById('proceedBtn');
        const closeModal = document.querySelector('.close-modal');
        const welcomeModal = document.getElementById('welcomeModal');

        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => this.proceedToDashboard());
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideWelcomeModal());
        }

        if (welcomeModal) {
            welcomeModal.addEventListener('click', (e) => {
                if (e.target === welcomeModal) {
                    this.hideWelcomeModal();
                }
            });
        }
    }

    showForm(formType) {
        console.log('Showing form:', formType);
        
        // Hide all forms
        const forms = document.querySelectorAll('.auth-form');
        forms.forEach(form => {
            form.classList.remove('active');
        });
        
        // Show the requested form
        const targetForm = document.getElementById(formType + 'Form');
        if (targetForm) {
            targetForm.classList.add('active');
            this.currentForm = formType;
        } else {
            console.error('Form not found:', formType + 'Form');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch('api/auth/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            
            if (data.success) {
                // Use the centralized auth helper
                AuthHelper.setAuthData(data.token, data.user);
                window.location.href = 'dashboard.html';
            } else {
                this.showError(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            age_group: document.getElementById('regAge').value,
            position: document.getElementById('regPosition').value,
            subscription: document.getElementById('regSubscription').value
        };

        // Validation
        for (const [key, value] of Object.entries(formData)) {
            if (!value && key !== 'subscription') {
                this.showError(`Please fill in the ${key.replace('_', ' ')} field`);
                return;
            }
        }

        this.showLoading(true);
        
        try {
            const response = await fetch('api/auth/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                // Use the centralized auth helper
                AuthHelper.setAuthData(data.token, data.user);
                this.showWelcomeScriptures();
            } else {
                this.showError(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Registration failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('forgotEmail').value;
        if (!email) {
            this.showError('Please enter your email address');
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await this.apiCall('forgot-password.php', 'POST', {
                email: email
            });

            if (response.success) {
                this.showSuccess('Password reset instructions sent to your email');
                this.showForm('login');
            } else {
                this.showError(response.message || 'Password reset failed');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showError('Password reset failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showWelcomeScriptures() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.style.display = 'block';
            this.startScriptureCarousel();
        }
    }

    hideWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.style.display = 'none';
            this.stopScriptureCarousel();
        }
    }

    startScriptureCarousel() {
        const verses = document.querySelectorAll('.scripture-verse');
        if (verses.length === 0) return;

        // Clear existing interval
        this.stopScriptureCarousel();

        // Show first verse
        verses.forEach((verse, index) => {
            verse.classList.remove('active');
            if (index === 0) {
                verse.classList.add('active');
            }
        });

        this.scriptureIndex = 0;
        
        // Change verse every 15 seconds (15000 milliseconds)
        this.scriptureInterval = setInterval(() => {
            verses[this.scriptureIndex].classList.remove('active');
            this.scriptureIndex = (this.scriptureIndex + 1) % verses.length;
            verses[this.scriptureIndex].classList.add('active');
        }, 15000); // 15 seconds
    }

    stopScriptureCarousel() {
        if (this.scriptureInterval) {
            clearInterval(this.scriptureInterval);
            this.scriptureInterval = null;
        }
    }

    proceedToDashboard() {
        this.stopScriptureCarousel();
        window.location.href = 'dashboard.html';
    }

    showLoading(show) {
        const currentForm = document.querySelector('.auth-form.active');
        const submitButton = currentForm?.querySelector('button[type="submit"]');
        
        if (submitButton) {
            if (show) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            } else {
                submitButton.disabled = false;
                
                // Reset button text based on current form
                if (currentForm.id === 'loginForm') {
                    submitButton.textContent = 'Login';
                } else if (currentForm.id === 'registerForm') {
                    submitButton.textContent = 'Create Account';
                } else if (currentForm.id === 'forgotPasswordForm') {
                    submitButton.textContent = 'Reset Password';
                }
            }
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch('api/auth/' + endpoint, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.auth-notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
                <span>${message}</span>
                <button class="close-notification">&times;</button>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#auth-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'auth-notification-styles';
            styles.textContent = `
                .auth-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    z-index: 10000;
                    border-left: 4px solid;
                    max-width: 300px;
                }
                .auth-notification.error {
                    border-left-color: var(--error);
                }
                .auth-notification.success {
                    border-left-color: var(--success);
                }
                .notification-content {
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
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

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Initialize auth when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the auth page (landing page)
    if (document.body.classList.contains('landing-page')) {
        window.auth = new Auth();
    }
});
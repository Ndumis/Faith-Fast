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
                this.showForm('forgotPassword');
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

        const confirmPassword = document.getElementById('regConfirmPassword').value;

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

        if (formData.password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return;
        }

        if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
            this.showError('Password must contain at least one letter and one number');
            return;
        }

        if (formData.password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
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
                this.showSuccess('If an account exists for that email, a password reset link has been sent.');
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
        showNotification(message, 'error');
    }

    showSuccess(message) {
        showNotification(message, 'success');
    }
}

// Initialize auth when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the auth page (landing page)
    if (document.body.classList.contains('landing-page')) {
        window.auth = new Auth();
    }
});
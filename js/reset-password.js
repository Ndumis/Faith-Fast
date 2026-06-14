class ResetPassword {
    constructor() {
        this.token = new URLSearchParams(window.location.search).get('token');
        this.init();
    }

    async init() {
        if (!this.token) {
            this.showState('invalidTokenState');
            return;
        }

        try {
            const response = await fetch(`api/auth/validate-reset-token.php?token=${encodeURIComponent(this.token)}`);
            const data = await response.json();

            if (!data.success) {
                this.showState('invalidTokenState');
                return;
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            this.showState('invalidTokenState');
            return;
        }

        document.getElementById('resetPasswordForm').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    showState(id) {
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    async handleSubmit(e) {
        e.preventDefault();

        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (password.length < 8) {
            showNotification('Password must be at least 8 characters long', 'error');
            return;
        }

        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            showNotification('Password must contain at least one letter and one number', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        const submitBtn = document.getElementById('resetSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';

        try {
            const response = await fetch('api/auth/reset-password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.token, password })
            });
            const data = await response.json();

            if (data.success) {
                this.showState('resetSuccessState');
            } else {
                showNotification(data.message || 'Failed to reset password', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
            }
        } catch (error) {
            console.error('Reset password error:', error);
            showNotification('Failed to reset password. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reset Password';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new ResetPassword());

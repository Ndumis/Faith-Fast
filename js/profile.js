class Profile {
    constructor() {
        this.user = null;
    }

    async init() {
        await this.loadUserProfile();
        this.bindEvents();
        this.renderProfile();
    }

    bindEvents() {
        document.getElementById('saveProfile').addEventListener('click', () => this.updateProfile());
        document.getElementById('updatePassword').addEventListener('click', () => this.updatePassword());
        document.getElementById('uploadAvatar').addEventListener('change', (e) => this.uploadAvatar(e.target.files[0]));
    }

    async loadUserProfile() {
        try {
            const response = await this.apiCall('profile/get.php');
            this.user = response.user;
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    renderProfile() {
        if (!this.user) return;

        document.getElementById('profileName').value = this.user.name || '';
        document.getElementById('profileEmail').value = this.user.email || '';
        document.getElementById('profileAge').value = this.user.age_group || '';
        document.getElementById('profilePosition').value = this.user.position || '';

        // Profile header card
        document.getElementById('profileDisplayName').textContent = this.user.name || 'Your Name';
        document.getElementById('profileEmailDisplay').textContent = this.user.email || '';

        const subscription = this.user.subscription || 'free';
        document.getElementById('profileSubscription').textContent =
            subscription.charAt(0).toUpperCase() + subscription.slice(1) + ' Account';

        this.updateAvatarDisplay();
    }

    updateAvatarDisplay() {
        const avatarImg = document.getElementById('avatarPreview');
        const avatarInitials = document.getElementById('avatarInitials');

        if (this.user.profile_picture) {
            avatarImg.src = this.user.profile_picture;
            avatarImg.style.display = 'block';
            avatarInitials.style.display = 'none';
        } else {
            avatarInitials.textContent = (this.user.name || '?').charAt(0).toUpperCase();
            avatarImg.style.display = 'none';
            avatarInitials.style.display = 'flex';
        }
    }

    async updateProfile() {
        const formData = {
            name: document.getElementById('profileName').value,
            email: document.getElementById('profileEmail').value,
            age_group: document.getElementById('profileAge').value,
            position: document.getElementById('profilePosition').value
        };

        try {
            const response = await this.apiCall('profile/update.php', 'PUT', formData);
            
            if (response.success) {
                this.showNotification('Profile updated successfully', 'success');
                await this.loadUserProfile();
                this.renderProfile();
            }
        } catch (error) {
            this.showNotification('Error updating profile', 'error');
        }
    }

    async updatePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        try {
            const response = await this.apiCall('profile/password.php', 'PUT', {
                current_password: currentPassword,
                new_password: newPassword
            });

            if (response.success) {
                this.showNotification('Password updated successfully', 'success');
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            }
        } catch (error) {
            this.showNotification('Error updating password', 'error');
        }
    }

    async uploadAvatar(file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('api/profile/avatar.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Avatar updated successfully', 'success');
                this.user.profile_picture = result.avatar_url;
                this.updateAvatarDisplay();
            }
        } catch (error) {
            this.showNotification('Error uploading avatar', 'error');
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('authToken');
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch('api/' + endpoint, options);
        return await response.json();
    }

    showNotification(message, type) {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}
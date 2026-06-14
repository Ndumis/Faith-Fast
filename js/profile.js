class Profile {
    constructor() {
        this.user = null;
        this.init();
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

        document.getElementById('profileName').value = this.user.name;
        document.getElementById('profileEmail').value = this.user.email;
        document.getElementById('profileAge').value = this.user.age_group;
        document.getElementById('profilePosition').value = this.user.position;
        document.getElementById('profileSubscription').value = this.user.subscription;
        
        // Update avatar preview
        if (this.user.profile_picture) {
            document.getElementById('avatarPreview').src = this.user.profile_picture;
        }
    }

    async updateProfile() {
        const formData = {
            name: document.getElementById('profileName').value,
            email: document.getElementById('profileEmail').value,
            age_group: document.getElementById('profileAge').value,
            position: document.getElementById('profilePosition').value,
            subscription: document.getElementById('profileSubscription').value
        };

        try {
            const response = await this.apiCall('profile/update.php', 'PUT', formData);
            
            if (response.success) {
                this.showNotification('Profile updated successfully', 'success');
                await this.loadUserProfile();
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
                document.getElementById('avatarPreview').src = result.avatar_url;
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
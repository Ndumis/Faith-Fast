// js/auth-helper.js
class AuthHelper {
    static getToken() {
        return localStorage.getItem('authToken');
    }

    static getUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    static isAuthenticated() {
        const token = this.getToken();
        const user = this.getUser();
        return !!(token && user);
    }

    static setAuthData(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    static clearAuthData() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    static getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    static async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: this.getAuthHeaders()
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`api/${endpoint}`, options);
            
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    static handleUnauthorized() {
        this.clearAuthData();
        window.location.href = 'index.html';
    }

    static validateToken() {
        if (!this.isAuthenticated()) {
            this.handleUnauthorized();
            return false;
        }
        return true;
    }
}
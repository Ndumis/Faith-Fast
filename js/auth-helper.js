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
        // FormData (file uploads) must be sent as-is with no Content-Type
        // header - the browser sets the multipart boundary itself. JSON-
        // stringifying a FormData object produces "{}" and silently drops
        // the file/fields.
        const isFormData = data instanceof FormData;
        const token = this.getToken();
        const options = {
            method: method,
            headers: isFormData
                ? { 'Authorization': token ? `Bearer ${token}` : '' }
                : this.getAuthHeaders()
        };

        if (data) {
            options.body = isFormData ? data : JSON.stringify(data);
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
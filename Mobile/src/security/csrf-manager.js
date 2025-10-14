/**
 * CSRF Token Manager
 * Handles CSRF token fetching, storage, and inclusion in requests
 */

class CSRFManager {
    constructor() {
        this.tokenKey = 'csrf-token';
        this.tokenExpiry = 'csrf-token-expiry';
        this.tokenPromise = null;
    }

    /**
     * Get API base URL
     */
    getApiUrl() {
        return window.location.hostname === 'localhost'
            ? 'http://localhost:5001'
            : 'https://proshael.onrender.com';
    }

    /**
     * Fetch CSRF token from backend
     */
    async fetchCSRFToken() {
        try {
            const response = await fetch(`${this.getApiUrl()}/api/csrf-token`, {
                method: 'GET',
                credentials: 'include', // Include cookies
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch CSRF token: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.csrfToken) {
                // Store token in memory (not localStorage for better security)
                sessionStorage.setItem(this.tokenKey, data.csrfToken);

                // Store expiry time (1 hour from now)
                const expiryTime = Date.now() + (data.expiresIn * 1000);
                sessionStorage.setItem(this.tokenExpiry, expiryTime.toString());

                console.log('✅ CSRF token fetched successfully');
                return data.csrfToken;
            }

            throw new Error('Invalid CSRF token response');
        } catch (error) {
            console.error('❌ CSRF token fetch error:', error);
            throw error;
        }
    }

    /**
     * Get CSRF token, fetching if necessary
     */
    async getCSRFToken() {
        try {
            // Check if token exists and is not expired
            const storedToken = sessionStorage.getItem(this.tokenKey);
            const expiryTime = sessionStorage.getItem(this.tokenExpiry);

            if (storedToken && expiryTime) {
                const now = Date.now();
                const expiry = parseInt(expiryTime, 10);

                if (now < expiry) {
                    return storedToken;
                }
            }

            // If a fetch is already in progress, wait for it
            if (this.tokenPromise) {
                return await this.tokenPromise;
            }

            // Fetch new token
            this.tokenPromise = this.fetchCSRFToken();
            const token = await this.tokenPromise;
            this.tokenPromise = null;

            return token;
        } catch (error) {
            this.tokenPromise = null;
            console.error('Failed to get CSRF token:', error);
            return null;
        }
    }

    /**
     * Clear CSRF token from storage
     */
    clearCSRFToken() {
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.tokenExpiry);
    }

    /**
     * Add CSRF token to fetch request
     */
    async addCSRFToRequest(options = {}) {
        try {
            const token = await this.getCSRFToken();

            if (!token) {
                console.warn('⚠️ No CSRF token available');
                return options;
            }

            // Add CSRF token to headers
            options.headers = options.headers || {};
            options.headers['X-CSRF-Token'] = token;

            // Ensure credentials are included
            options.credentials = 'include';

            return options;
        } catch (error) {
            console.error('Failed to add CSRF token:', error);
            return options;
        }
    }

    /**
     * Add CSRF token to form data
     */
    async addCSRFToFormData(formData) {
        try {
            const token = await this.getCSRFToken();

            if (token) {
                formData.append('_csrf', token);
            }

            return formData;
        } catch (error) {
            console.error('Failed to add CSRF to form:', error);
            return formData;
        }
    }

    /**
     * Add CSRF hidden input to form
     */
    async addCSRFToForm(formElement) {
        try {
            const token = await this.getCSRFToken();

            if (!token) {
                console.warn('⚠️ No CSRF token for form');
                return;
            }

            // Remove any existing CSRF input
            const existingInput = formElement.querySelector('input[name="_csrf"]');
            if (existingInput) {
                existingInput.remove();
            }

            // Add new CSRF input
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_csrf';
            csrfInput.value = token;
            formElement.appendChild(csrfInput);

            console.log('✅ CSRF token added to form');
        } catch (error) {
            console.error('Failed to add CSRF to form:', error);
        }
    }

    /**
     * Refresh CSRF token
     */
    async refreshCSRFToken() {
        this.clearCSRFToken();
        return await this.getCSRFToken();
    }

    /**
     * Initialize CSRF protection on page load
     */
    async initialize() {
        try {
            await this.getCSRFToken();
            console.log('✅ CSRF protection initialized');
        } catch (error) {
            console.error('❌ Failed to initialize CSRF protection:', error);
        }
    }
}

// Create singleton instance
const csrfManager = new CSRFManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = csrfManager;
}

// ES6 default export
export default csrfManager;
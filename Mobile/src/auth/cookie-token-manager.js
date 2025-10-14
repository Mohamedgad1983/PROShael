/**
 * Cookie-based Token Manager - Al-Shuail Mobile PWA
 * Secure JWT token management using httpOnly cookies
 *
 * Features:
 * - No token storage in localStorage (XSS protection)
 * - User data only storage (non-sensitive)
 * - Automatic cookie handling by browser
 * - Token refresh via backend
 * - Backward compatibility with existing code
 */

class CookieTokenManager {
  constructor() {
    this.config = {
      userDataKey: 'user_data',
      apiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
              || 'https://proshael.onrender.com'
    };
  }

  /**
   * Save user data only (token is in httpOnly cookie)
   * @param {string} token - JWT token (ignored - kept for compatibility)
   * @param {Object} user - User data
   * @param {string} refreshToken - Refresh token (ignored)
   */
  saveToken(token, user, refreshToken = null) {
    try {
      // Only save user data, not the token
      if (user) {
        localStorage.setItem(this.config.userDataKey, JSON.stringify(user));
      }

      console.log('✅ User data saved (token in secure cookie)');
      return true;
    } catch (error) {
      console.error('Failed to save user data:', error);
      return false;
    }
  }

  /**
   * Get token (always returns null - token is in httpOnly cookie)
   * @returns {string|null} - Always null (for compatibility)
   */
  getToken() {
    // Token is in httpOnly cookie and sent automatically
    // Return null to indicate no client-side token
    return null;
  }

  /**
   * Get user data from storage
   * @returns {Object|null} - User data or null
   */
  getUserData() {
    try {
      const userData = localStorage.getItem(this.config.userDataKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  clearToken() {
    try {
      // Clear user data
      localStorage.removeItem(this.config.userDataKey);

      // Call logout endpoint to clear cookie
      this.logoutFromServer();

      console.log('✅ Authentication data cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear authentication:', error);
      return false;
    }
  }

  /**
   * Call logout endpoint to clear httpOnly cookie
   */
  async logoutFromServer() {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Important for cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Logout request failed');
      }
    } catch (error) {
      console.error('Failed to logout from server:', error);
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} - Authentication status
   */
  isAuthenticated() {
    // Check if user data exists
    const userData = this.getUserData();
    return !!userData;
  }

  /**
   * Get authentication status (for compatibility with login.js)
   * @returns {Object} - { isAuthenticated: boolean, user: Object|null }
   */
  getAuthStatus() {
    const userData = this.getUserData();
    return {
      isAuthenticated: !!userData,
      user: userData
    };
  }

  /**
   * Verify token validity with backend
   * @returns {Promise<boolean>} - Token validity
   */
  async verifyToken() {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/auth/verify`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success;
      }

      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Refresh token via backend
   * @returns {Promise<boolean>} - Refresh success
   */
  async refreshToken() {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        // Update user data if provided
        if (data.user) {
          localStorage.setItem(this.config.userDataKey, JSON.stringify(data.user));
        }

        console.log('✅ Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Decode token (not available with httpOnly cookies)
   * @returns {Object|null} - Always null
   */
  decodeToken() {
    // Cannot decode httpOnly cookie on client side
    // Return user data instead
    return this.getUserData();
  }

  /**
   * Get token expiry (not available with httpOnly cookies)
   * @returns {number|null} - Always null
   */
  getTokenExpiry() {
    // Cannot access httpOnly cookie expiry on client side
    return null;
  }

  /**
   * Check if token is expired (delegates to backend)
   * @returns {Promise<boolean>} - Expiry status
   */
  async isTokenExpired() {
    // Check with backend
    const isValid = await this.verifyToken();
    return !isValid;
  }

  /**
   * Handle authentication response
   * @param {Object} response - Login response from backend
   */
  handleAuthResponse(response) {
    if (response.success) {
      // Save user data only (token is in cookie)
      if (response.user) {
        this.saveToken(null, response.user);
      }
      return true;
    }
    return false;
  }

  /**
   * Initialize token manager
   * Verifies current authentication status
   */
  async initialize() {
    try {
      // Verify if cookie is still valid
      const isValid = await this.verifyToken();

      if (!isValid) {
        // Clear local user data if token is invalid
        this.clearToken();
      }

      console.log('✅ Cookie token manager initialized');
    } catch (error) {
      console.error('Failed to initialize token manager:', error);
    }
  }

  /**
   * Start monitoring (not needed for cookies)
   */
  startTokenRefreshMonitor() {
    // Cookies are refreshed by backend automatically
    // No client-side monitoring needed
    console.log('✅ Cookie-based auth - no client monitoring needed');
  }
}

// Create singleton instance
const cookieTokenManager = new CookieTokenManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cookieTokenManager;
}

// Also export as default for ES6 modules
export default cookieTokenManager;
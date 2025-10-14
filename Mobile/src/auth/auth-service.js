/**
 * Authentication Service - Al-Shuail Mobile PWA
 * Phase 1: Mock OTP Authentication with JWT Integration
 *
 * Features:
 * - Mock OTP generation (hardcoded 123456 for development)
 * - Phone number validation (Saudi format: 05xxxxxxxx)
 * - Rate limiting (3 OTPs per phone per hour)
 * - JWT token integration
 * - Bilingual error messages (Arabic/English)
 */

import logger from '../utils/logger.js';

class AuthService {
  constructor() {
    // Environment configuration with safe import.meta check
    this.config = {
      apiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
              || 'https://proshael.onrender.com',
      mockOtpEnabled: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK_OTP_ENABLED === 'true')
                      || true, // Default to true for development
      mockOtpCode: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK_OTP_CODE)
                   || '123456',
      maxOtpAttempts: 3,
      otpRateLimitWindow: 3600000, // 1 hour in milliseconds
    };

    // In-memory rate limiting storage (production should use backend)
    this.otpAttempts = new Map();

    // Error messages (bilingual)
    this.errors = {
      invalidPhone: {
        ar: 'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
        en: 'Invalid phone number. Must start with 05 and contain 10 digits'
      },
      rateLimitExceeded: {
        ar: 'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ساعة',
        en: 'Maximum attempts exceeded. Please try again in 1 hour'
      },
      otpSendFailed: {
        ar: 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى',
        en: 'Failed to send OTP. Please try again'
      },
      invalidOtp: {
        ar: 'رمز التحقق غير صحيح',
        en: 'Invalid OTP code'
      },
      networkError: {
        ar: 'خطأ في الاتصال. يرجى التحقق من الإنترنت',
        en: 'Network error. Please check your connection'
      }
    };
  }

  /**
   * Validate Saudi phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - True if valid
   */
  validatePhoneNumber(phone) {
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Saudi format: 05xxxxxxxx (10 digits starting with 05)
    const saudiPhoneRegex = /^05\d{8}$/;

    return saudiPhoneRegex.test(cleanPhone);
  }

  /**
   * Check if phone number has exceeded rate limit
   * @param {string} phone - Phone number to check
   * @returns {boolean} - True if rate limit exceeded
   */
  isRateLimited(phone) {
    const attempts = this.otpAttempts.get(phone);

    if (!attempts) {
      return false;
    }

    const now = Date.now();
    const recentAttempts = attempts.filter(
      timestamp => now - timestamp < this.config.otpRateLimitWindow
    );

    // Update attempts (remove old ones)
    if (recentAttempts.length === 0) {
      this.otpAttempts.delete(phone);
      return false;
    }

    this.otpAttempts.set(phone, recentAttempts);
    return recentAttempts.length >= this.config.maxOtpAttempts;
  }

  /**
   * Record OTP attempt for rate limiting
   * @param {string} phone - Phone number
   */
  recordOtpAttempt(phone) {
    const attempts = this.otpAttempts.get(phone) || [];
    attempts.push(Date.now());
    this.otpAttempts.set(phone, attempts);
  }

  /**
   * Send OTP to phone number (Mock implementation)
   * @param {string} phone - Phone number
   * @param {string} lang - Language preference ('ar' or 'en')
   * @returns {Promise<Object>} - Result with success status and message
   */
  async sendOtp(phone, lang = 'ar') {
    try {
      // Validate phone number
      if (!this.validatePhoneNumber(phone)) {
        return {
          success: false,
          error: this.errors.invalidPhone[lang],
          errorCode: 'INVALID_PHONE'
        };
      }

      // Check rate limiting
      if (this.isRateLimited(phone)) {
        return {
          success: false,
          error: this.errors.rateLimitExceeded[lang],
          errorCode: 'RATE_LIMIT_EXCEEDED'
        };
      }

      // Record attempt
      this.recordOtpAttempt(phone);

      // Mock OTP mode
      if (this.config.mockOtpEnabled) {
        logger.debug('Mock OTP sent', { phone, otpCode: this.config.mockOtpCode });

        return {
          success: true,
          message: lang === 'ar'
            ? `تم إرسال رمز التحقق ${this.config.mockOtpCode} (وضع التطوير)`
            : `OTP sent: ${this.config.mockOtpCode} (Development Mode)`,
          mockMode: true,
          otpCode: this.config.mockOtpCode // Only in development
        };
      }

      // Production mode: Call backend API
      const response = await fetch(`${this.config.apiUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, lang })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        message: lang === 'ar'
          ? 'تم إرسال رمز التحقق إلى هاتفك'
          : 'OTP sent to your phone',
        expiresIn: data.expiresIn || 300 // 5 minutes default
      };

    } catch (error) {
      logger.error('Send OTP error', { error: error.message });

      return {
        success: false,
        error: this.errors.otpSendFailed[lang],
        errorCode: 'OTP_SEND_FAILED',
        details: error.message
      };
    }
  }

  /**
   * Verify OTP code
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   * @param {string} lang - Language preference
   * @returns {Promise<Object>} - Result with success status, token, and user data
   */
  async verifyOtp(phone, otp, lang = 'ar') {
    try {
      // Validate phone number
      if (!this.validatePhoneNumber(phone)) {
        return {
          success: false,
          error: this.errors.invalidPhone[lang],
          errorCode: 'INVALID_PHONE'
        };
      }

      // Mock OTP verification
      if (this.config.mockOtpEnabled) {
        if (otp === this.config.mockOtpCode) {
          logger.debug('Mock OTP verification successful', { phone });

          // Generate mock JWT token (in production, backend generates this)
          const mockToken = this.generateMockToken(phone);

          return {
            success: true,
            message: lang === 'ar' ? 'تم التحقق بنجاح' : 'Verification successful',
            token: mockToken,
            user: {
              phone: phone,
              id: `mock_${phone}`,
              name: 'Test User',
              role: 'member',
              mockMode: true
            }
          };
        } else {
          return {
            success: false,
            error: this.errors.invalidOtp[lang],
            errorCode: 'INVALID_OTP'
          };
        }
      }

      // Production mode: Call backend API
      const response = await fetch(`${this.config.apiUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, otp, lang })
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: this.errors.invalidOtp[lang],
            errorCode: 'INVALID_OTP'
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        message: lang === 'ar' ? 'تم التحقق بنجاح' : 'Verification successful',
        token: data.token,
        user: data.user
      };

    } catch (error) {
      logger.error('Verify OTP error', { error: error.message });

      return {
        success: false,
        error: this.errors.networkError[lang],
        errorCode: 'NETWORK_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Generate mock JWT token for development
   * @param {string} phone - Phone number
   * @returns {string} - Mock JWT token
   */
  generateMockToken(phone) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      phone: phone,
      id: `mock_${phone}`,
      role: 'member',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      mock: true
    }));
    const signature = btoa('mock_signature_' + phone);

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Get current authentication status
   * @returns {Object} - Authentication status
   */
  getAuthStatus() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user_data');

    return {
      isAuthenticated: !!token,
      token: token,
      user: user ? JSON.parse(user) : null
    };
  }

  /**
   * Save authentication data
   * @param {string} token - JWT token
   * @param {Object} user - User data
   */
  saveAuthData(token, user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('auth-status-changed', {
      detail: { isAuthenticated: true, user }
    }));
  }

  /**
   * Clear authentication data (logout)
   */
  clearAuthData() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('auth-status-changed', {
      detail: { isAuthenticated: false, user: null }
    }));
  }

  /**
   * Logout user
   */
  async logout() {
    this.clearAuthData();

    // Redirect to login
    if (window.location.pathname !== '/login.html') {
      window.location.href = '/login.html';
    }
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;

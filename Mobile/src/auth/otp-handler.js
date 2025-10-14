/**
 * OTP Handler - Al-Shuail Mobile PWA
 * Phase 1: OTP Validation and Management
 *
 * Features:
 * - OTP validation logic
 * - OTP expiry management
 * - Retry attempt tracking
 * - Auto-resend functionality
 */

class OTPHandler {
  constructor() {
    this.config = {
      otpLength: 6,
      otpExpiryTime: 300000, // 5 minutes in milliseconds
      maxVerifyAttempts: 3,
      resendCooldown: 60000, // 1 minute cooldown between resends
    };

    // OTP session storage
    this.otpSessions = new Map();

    // Error messages
    this.errors = {
      otpExpired: {
        ar: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد',
        en: 'OTP expired. Please request a new code'
      },
      tooManyAttempts: {
        ar: 'تم تجاوز عدد المحاولات المسموحة',
        en: 'Too many verification attempts'
      },
      resendCooldown: {
        ar: 'يرجى الانتظار قبل إعادة الإرسال',
        en: 'Please wait before resending'
      },
      invalidFormat: {
        ar: 'رمز التحقق يجب أن يتكون من 6 أرقام',
        en: 'OTP must be 6 digits'
      }
    };
  }

  /**
   * Validate OTP format
   * @param {string} otp - OTP code to validate
   * @returns {boolean} - True if format is valid
   */
  validateOtpFormat(otp) {
    const otpRegex = new RegExp(`^\\d{${this.config.otpLength}}$`);
    return otpRegex.test(otp);
  }

  /**
   * Create OTP session when OTP is sent
   * @param {string} phone - Phone number
   * @param {string} otpCode - OTP code (only for mock mode)
   */
  createOtpSession(phone, otpCode = null) {
    const session = {
      phone: phone,
      otpCode: otpCode, // Only populated in mock mode
      sentAt: Date.now(),
      expiresAt: Date.now() + this.config.otpExpiryTime,
      verifyAttempts: 0,
      lastResendAt: Date.now()
    };

    this.otpSessions.set(phone, session);

    // Auto-cleanup expired session
    setTimeout(() => {
      this.cleanupExpiredSession(phone);
    }, this.config.otpExpiryTime);

    return session;
  }

  /**
   * Get OTP session for phone number
   * @param {string} phone - Phone number
   * @returns {Object|null} - Session object or null
   */
  getOtpSession(phone) {
    return this.otpSessions.get(phone) || null;
  }

  /**
   * Check if OTP session is expired
   * @param {string} phone - Phone number
   * @returns {boolean} - True if expired
   */
  isOtpExpired(phone) {
    const session = this.getOtpSession(phone);

    if (!session) {
      return true;
    }

    return Date.now() > session.expiresAt;
  }

  /**
   * Check if phone can resend OTP (cooldown check)
   * @param {string} phone - Phone number
   * @returns {Object} - Can resend status with remaining time
   */
  canResendOtp(phone) {
    const session = this.getOtpSession(phone);

    if (!session) {
      return { canResend: true, remainingTime: 0 };
    }

    const timeSinceLastResend = Date.now() - session.lastResendAt;
    const remainingTime = this.config.resendCooldown - timeSinceLastResend;

    return {
      canResend: remainingTime <= 0,
      remainingTime: Math.max(0, Math.ceil(remainingTime / 1000)) // seconds
    };
  }

  /**
   * Increment verify attempts and check if limit exceeded
   * @param {string} phone - Phone number
   * @returns {Object} - Attempt status
   */
  incrementVerifyAttempts(phone) {
    const session = this.getOtpSession(phone);

    if (!session) {
      return { exceeded: true, remaining: 0 };
    }

    session.verifyAttempts += 1;
    this.otpSessions.set(phone, session);

    const remaining = this.config.maxVerifyAttempts - session.verifyAttempts;

    return {
      exceeded: session.verifyAttempts >= this.config.maxVerifyAttempts,
      remaining: Math.max(0, remaining),
      attempts: session.verifyAttempts
    };
  }

  /**
   * Validate OTP code
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code to validate
   * @param {string} lang - Language preference
   * @returns {Object} - Validation result
   */
  validateOtp(phone, otp, lang = 'ar') {
    // Check format
    if (!this.validateOtpFormat(otp)) {
      return {
        valid: false,
        error: this.errors.invalidFormat[lang],
        errorCode: 'INVALID_FORMAT'
      };
    }

    // Get session
    const session = this.getOtpSession(phone);

    if (!session) {
      return {
        valid: false,
        error: this.errors.otpExpired[lang],
        errorCode: 'SESSION_NOT_FOUND'
      };
    }

    // Check expiry
    if (this.isOtpExpired(phone)) {
      this.cleanupExpiredSession(phone);
      return {
        valid: false,
        error: this.errors.otpExpired[lang],
        errorCode: 'OTP_EXPIRED'
      };
    }

    // Check attempts
    const attemptStatus = this.incrementVerifyAttempts(phone);

    if (attemptStatus.exceeded) {
      this.cleanupExpiredSession(phone);
      return {
        valid: false,
        error: this.errors.tooManyAttempts[lang],
        errorCode: 'TOO_MANY_ATTEMPTS'
      };
    }

    // Validate OTP (mock mode only - production backend validates)
    if (session.otpCode && otp !== session.otpCode) {
      return {
        valid: false,
        error: lang === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid OTP code',
        errorCode: 'INVALID_OTP',
        attemptsRemaining: attemptStatus.remaining
      };
    }

    // Success
    this.cleanupExpiredSession(phone);

    return {
      valid: true,
      message: lang === 'ar' ? 'تم التحقق بنجاح' : 'Verification successful'
    };
  }

  /**
   * Update last resend timestamp
   * @param {string} phone - Phone number
   */
  updateResendTimestamp(phone) {
    const session = this.getOtpSession(phone);

    if (session) {
      session.lastResendAt = Date.now();
      session.verifyAttempts = 0; // Reset attempts on resend
      this.otpSessions.set(phone, session);
    }
  }

  /**
   * Clean up expired session
   * @param {string} phone - Phone number
   */
  cleanupExpiredSession(phone) {
    this.otpSessions.delete(phone);
  }

  /**
   * Get OTP expiry time remaining
   * @param {string} phone - Phone number
   * @returns {number} - Seconds remaining or 0 if expired
   */
  getExpiryTimeRemaining(phone) {
    const session = this.getOtpSession(phone);

    if (!session) {
      return 0;
    }

    const remaining = session.expiresAt - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000)); // seconds
  }

  /**
   * Format time remaining as MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  formatTimeRemaining(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Clear all sessions (for testing/logout)
   */
  clearAllSessions() {
    this.otpSessions.clear();
  }

  /**
   * Get session statistics (for debugging)
   * @returns {Object} - Session stats
   */
  getSessionStats() {
    const sessions = Array.from(this.otpSessions.values());

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => !this.isOtpExpired(s.phone)).length,
      expiredSessions: sessions.filter(s => this.isOtpExpired(s.phone)).length
    };
  }
}

// Export singleton instance
const otpHandler = new OTPHandler();
export default otpHandler;

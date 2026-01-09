/**
 * Authentication Service
 * Handles WhatsApp OTP authentication
 * 
 * Updated: December 2, 2025
 * - Changed to WhatsApp OTP flow
 * - Endpoints: /otp/send, /otp/verify
 */
import api, { setAuthToken } from '../utils/api'

const authService = {
  /**
   * Send OTP via WhatsApp
   * @param {string} phone - Phone number (05xxxxxxxx or +966xxxxxxxx)
   * @returns {Promise<{success: boolean, message: string, expiresIn?: number, memberName?: string}>}
   */
  sendOTP: async (phone) => {
    try {
      const response = await api.post('/otp/send', { phone })
      return response.data
    } catch (error) {
      // Handle error response
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * Verify OTP and login
   * @param {string} phone - Phone number
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<{success: boolean, token?: string, user?: object, message?: string}>}
   */
  verifyOTP: async (phone, otp) => {
    try {
      const response = await api.post('/otp/verify', { phone, otp })
      
      if (response.data.success && response.data.token) {
        // Store token
        setAuthToken(response.data.token)
        // Store user data
        if (response.data.user) {
          localStorage.setItem('alshuail_user', JSON.stringify(response.data.user))
        }
      }
      
      return response.data
    } catch (error) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * Resend OTP via WhatsApp
   * @param {string} phone - Phone number
   * @returns {Promise<{success: boolean, message: string, expiresIn?: number}>}
   */
  resendOTP: async (phone) => {
    try {
      const response = await api.post('/otp/resend', { phone })
      return response.data
    } catch (error) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * Check WhatsApp service status
   * @returns {Promise<{success: boolean, whatsapp: object, testMode: boolean}>}
   */
  checkOTPStatus: async () => {
    try {
      const response = await api.get('/otp/status')
      return response.data
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  /**
   * Legacy: Login with phone and password (kept for fallback)
   * @param {string} phone - Phone number
   * @param {string} password - Password
   */
  mobileLogin: async (phone, password) => {
    try {
      const response = await api.post('/auth/mobile-login', { phone, password })
      if (response.data.token) {
        setAuthToken(response.data.token)
      }
      return response.data
    } catch (error) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * Verify current token
   */
  verifyToken: async () => {
    try {
      const response = await api.post('/auth/verify')
      return response.data
    } catch (error) {
      return { success: false }
    }
  },

  /**
   * Change password
   * @param {string} currentPassword 
   * @param {string} newPassword 
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
    return response.data
  },

  /**
   * Logout
   */
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    }
    setAuthToken(null)
    localStorage.removeItem('alshuail_user')
    localStorage.removeItem('alshuail_token')
  }
}

export default authService

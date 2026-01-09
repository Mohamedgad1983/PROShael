import { describe, it, expect, beforeEach, vi } from 'vitest'
import api, { setAuthToken, getAuthToken, isAuthenticated } from '../../../src/utils/api'
import axios from 'axios'

describe('api utility', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Clear any existing Authorization header
    delete api.defaults.headers.common['Authorization']
    // Reset window.location.href
    if (window.location.href === '/login') {
      window.location.href = 'http://localhost:5173'
    }
  })

  describe('axios instance configuration', () => {
    it('should have correct base URL', () => {
      expect(api.defaults.baseURL).toBe('https://api.alshailfund.com/api')
    })

    it('should have 30 second timeout', () => {
      expect(api.defaults.timeout).toBe(30000)
    })

    it('should have application/json Content-Type header', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('setAuthToken', () => {
    it('should store token in localStorage and set axios header', () => {
      const token = 'test-token-123'

      setAuthToken(token)

      expect(localStorage.setItem).toHaveBeenCalledWith('alshuail_token', token)
      expect(api.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`)
    })

    it('should remove token from localStorage when token is null', () => {
      // First set a token
      localStorage.setItem('alshuail_token', 'old-token')
      api.defaults.headers.common['Authorization'] = 'Bearer old-token'

      // Then clear it
      setAuthToken(null)

      expect(localStorage.removeItem).toHaveBeenCalledWith('alshuail_token')
      expect(api.defaults.headers.common['Authorization']).toBeUndefined()
    })

    it('should remove token from localStorage when token is undefined', () => {
      localStorage.setItem('alshuail_token', 'old-token')
      api.defaults.headers.common['Authorization'] = 'Bearer old-token'

      setAuthToken(undefined)

      expect(localStorage.removeItem).toHaveBeenCalledWith('alshuail_token')
      expect(api.defaults.headers.common['Authorization']).toBeUndefined()
    })
  })

  describe('getAuthToken', () => {
    it('should retrieve token from localStorage', () => {
      const token = 'stored-token-456'
      localStorage.setItem('alshuail_token', token)

      const result = getAuthToken()

      expect(result).toBe(token)
      expect(localStorage.getItem).toHaveBeenCalledWith('alshuail_token')
    })

    it('should return null when no token exists', () => {
      const result = getAuthToken()

      expect(result).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('alshuail_token', 'valid-token')

      const result = isAuthenticated()

      expect(result).toBe(true)
    })

    it('should return false when token does not exist', () => {
      const result = isAuthenticated()

      expect(result).toBe(false)
    })

    it('should return false when token is empty string', () => {
      localStorage.setItem('alshuail_token', '')

      const result = isAuthenticated()

      expect(result).toBe(false)
    })
  })

  describe('request interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      const token = 'interceptor-token'
      localStorage.setItem('alshuail_token', token)

      const config = {
        headers: {},
        data: { test: 'data' }
      }

      const interceptedConfig = api.interceptors.request.handlers[0].fulfilled(config)

      expect(interceptedConfig.headers.Authorization).toBe(`Bearer ${token}`)
    })

    it('should not add Authorization header when no token', async () => {
      const config = {
        headers: {},
        data: { test: 'data' }
      }

      const interceptedConfig = api.interceptors.request.handlers[0].fulfilled(config)

      expect(interceptedConfig.headers.Authorization).toBeUndefined()
    })

    it('should delete Content-Type header for FormData requests', async () => {
      const formData = new FormData()
      formData.append('file', 'test')

      const config = {
        headers: {
          'Content-Type': 'application/json'
        },
        data: formData
      }

      const interceptedConfig = api.interceptors.request.handlers[0].fulfilled(config)

      expect(interceptedConfig.headers['Content-Type']).toBeUndefined()
    })

    it('should not delete Content-Type header for regular JSON requests', async () => {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        },
        data: { test: 'data' }
      }

      const interceptedConfig = api.interceptors.request.handlers[0].fulfilled(config)

      expect(interceptedConfig.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('response interceptor', () => {
    it('should handle 401 errors by clearing storage and redirecting', async () => {
      // Setup
      localStorage.setItem('alshuail_token', 'expired-token')
      localStorage.setItem('alshuail_user', JSON.stringify({ id: 1 }))
      const originalLocation = window.location.href

      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      }

      // Execute interceptor
      try {
        await api.interceptors.response.handlers[0].rejected(error)
      } catch (e) {
        // Expected to throw
      }

      // Verify
      expect(localStorage.removeItem).toHaveBeenCalledWith('alshuail_token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('alshuail_user')
      expect(window.location.href).toBe('/login')
    })

    it('should pass through successful responses', async () => {
      const response = {
        data: { success: true },
        status: 200
      }

      const result = api.interceptors.response.handlers[0].fulfilled(response)

      expect(result).toBe(response)
    })

    it('should reject non-401 errors without redirecting', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      }

      try {
        await api.interceptors.response.handlers[0].rejected(error)
        expect.fail('Should have thrown error')
      } catch (e) {
        expect(e).toBe(error)
        expect(window.location.href).not.toBe('/login')
      }
    })

    it('should handle errors without response object', async () => {
      const error = {
        message: 'Network Error'
      }

      try {
        await api.interceptors.response.handlers[0].rejected(error)
        expect.fail('Should have thrown error')
      } catch (e) {
        expect(e).toBe(error)
      }
    })
  })

  describe('integration', () => {
    it('should work end-to-end with token flow', () => {
      // No token initially
      expect(isAuthenticated()).toBe(false)

      // Set token
      const token = 'integration-token'
      setAuthToken(token)

      // Should be authenticated
      expect(isAuthenticated()).toBe(true)
      expect(getAuthToken()).toBe(token)
      expect(api.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`)

      // Clear token
      setAuthToken(null)

      // Should not be authenticated
      expect(isAuthenticated()).toBe(false)
      expect(getAuthToken()).toBeNull()
      expect(api.defaults.headers.common['Authorization']).toBeUndefined()
    })
  })
})

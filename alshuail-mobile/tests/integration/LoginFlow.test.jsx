/**
 * Integration Test: Login Flow
 * Tests complete user authentication flow from phone entry to OTP verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import Login from '../../src/pages/Login'
import { authService } from '../../src/services'

// Mock authService
vi.mock('../../src/services', () => ({
  authService: {
    sendOTP: vi.fn(),
    verifyOTP: vi.fn(),
  },
}))

// Mock useAuth hook
const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../src/App', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Login Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Phone Entry Step', () => {
    it('should render phone entry form', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      )

      expect(screen.getByText(/مرحباً بك/)).toBeDefined()
      expect(screen.getByPlaceholderText(/05xxxxxxxx/)).toBeDefined()
      expect(screen.getByText('إرسال رمز التحقق')).toBeDefined()
    })

    it('should validate and send OTP for valid Saudi phone', async () => {
      authService.sendOTP.mockResolvedValue({
        success: true,
        memberName: 'محمد أحمد',
      })

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      )

      const phoneInput = screen.getByPlaceholderText(/05xxxxxxxx/)
      const sendButton = screen.getByText('إرسال رمز التحقق')

      fireEvent.change(phoneInput, { target: { value: '0512345678' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(authService.sendOTP).toHaveBeenCalledWith('0512345678')
      })

      // Should transition to OTP step
      await waitFor(() => {
        expect(screen.getByText(/تم إرسال الرمز/)).toBeDefined()
      })
    })

    it('should show error for invalid phone number', async () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      )

      const phoneInput = screen.getByPlaceholderText(/05xxxxxxxx/)
      const sendButton = screen.getByText('إرسال رمز التحقق')

      fireEvent.change(phoneInput, { target: { value: '123' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/رقم الجوال غير صحيح/)).toBeDefined()
      })

      expect(authService.sendOTP).not.toHaveBeenCalled()
    })

    it('should handle API error when sending OTP', async () => {
      authService.sendOTP.mockRejectedValue(new Error('Network error'))

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      )

      const phoneInput = screen.getByPlaceholderText(/05xxxxxxxx/)
      const sendButton = screen.getByText('إرسال رمز التحقق')

      fireEvent.change(phoneInput, { target: { value: '0512345678' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/حدث خطأ/)).toBeDefined()
      })
    })
  })

  describe('OTP Verification Step', () => {
    beforeEach(async () => {
      authService.sendOTP.mockResolvedValue({
        success: true,
        memberName: 'محمد أحمد',
      })

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      )

      // Complete phone step first
      const phoneInput = screen.getByPlaceholderText(/05xxxxxxxx/)
      const sendButton = screen.getByText('إرسال رمز التحقق')

      fireEvent.change(phoneInput, { target: { value: '0512345678' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/تم إرسال الرمز/)).toBeDefined()
      })
    })

    it('should verify OTP and login successfully', async () => {
      const mockUser = {
        id: 1,
        full_name_ar: 'محمد أحمد',
        phone: '0512345678',
        balance: 1000,
      }

      authService.verifyOTP.mockResolvedValue({
        success: true,
        token: 'test-jwt-token',
        user: mockUser,
      })

      // Enter OTP
      const otpInputs = screen.getAllByRole('textbox').filter(input =>
        input.getAttribute('maxlength') === '1'
      )

      otpInputs.forEach((input, index) => {
        fireEvent.change(input, { target: { value: (index + 1).toString() } })
      })

      await waitFor(() => {
        expect(authService.verifyOTP).toHaveBeenCalledWith('0512345678', '123456')
      })

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(mockUser, 'test-jwt-token')
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show error for invalid OTP', async () => {
      authService.verifyOTP.mockResolvedValue({
        success: false,
        message: 'رمز التحقق غير صحيح',
      })

      const otpInputs = screen.getAllByRole('textbox').filter(input =>
        input.getAttribute('maxlength') === '1'
      )

      otpInputs.forEach((input, index) => {
        fireEvent.change(input, { target: { value: (index + 1).toString() } })
      })

      await waitFor(() => {
        expect(screen.getByText(/رمز التحقق غير صحيح/)).toBeDefined()
      })

      expect(mockLogin).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should handle network error during verification', async () => {
      authService.verifyOTP.mockRejectedValue(new Error('Network error'))

      const otpInputs = screen.getAllByRole('textbox').filter(input =>
        input.getAttribute('maxlength') === '1'
      )

      otpInputs.forEach((input, index) => {
        fireEvent.change(input, { target: { value: (index + 1).toString() } })
      })

      await waitFor(() => {
        expect(screen.getByText(/حدث خطأ/)).toBeDefined()
      })

      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should allow resending OTP after cooldown', async () => {
      vi.useFakeTimers()

      authService.sendOTP.mockResolvedValue({
        success: true,
        memberName: 'محمد أحمد',
      })

      // Wait for initial cooldown (60 seconds)
      vi.advanceTimersByTime(61000)

      const resendButton = screen.getByText(/إعادة إرسال/)
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(authService.sendOTP).toHaveBeenCalledTimes(2) // Initial + resend
      })

      vi.useRealTimers()
    })

    it('should show OTP expiry countdown', () => {
      vi.useFakeTimers()

      // Check initial time (5 minutes = 300 seconds)
      expect(screen.getByText(/5:00/)).toBeDefined()

      // Advance 1 minute
      vi.advanceTimersByTime(60000)

      expect(screen.getByText(/4:00/)).toBeDefined()

      vi.useRealTimers()
    })
  })

  describe('Navigation and Back Button', () => {
    it('should allow going back from OTP step to phone step', async () => {
      authService.sendOTP.mockResolvedValue({
        success: true,
        memberName: 'محمد أحمد',
      })

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      )

      // Go to OTP step
      const phoneInput = screen.getByPlaceholderText(/05xxxxxxxx/)
      const sendButton = screen.getByText('إرسال رمز التحقق')

      fireEvent.change(phoneInput, { target: { value: '0512345678' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/تم إرسال الرمز/)).toBeDefined()
      })

      // Click back button
      const backButton = screen.getAllByRole('button')[0] // First button is back
      fireEvent.click(backButton)

      // Should be back to phone step
      expect(screen.getByPlaceholderText(/05xxxxxxxx/)).toBeDefined()
    })
  })

  describe('Complete Login Flow', () => {
    it('should complete entire flow from phone to dashboard', async () => {
      const mockUser = {
        id: 1,
        full_name_ar: 'محمد أحمد',
        phone: '0512345678',
        balance: 1000,
      }

      authService.sendOTP.mockResolvedValue({
        success: true,
        memberName: 'محمد أحمد',
      })

      authService.verifyOTP.mockResolvedValue({
        success: true,
        token: 'test-jwt-token',
        user: mockUser,
      })

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      )

      // Step 1: Enter phone
      const phoneInput = screen.getByPlaceholderText(/05xxxxxxxx/)
      fireEvent.change(phoneInput, { target: { value: '0512345678' } })

      // Step 2: Send OTP
      const sendButton = screen.getByText('إرسال رمز التحقق')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(authService.sendOTP).toHaveBeenCalledWith('0512345678')
      })

      // Step 3: Enter OTP
      await waitFor(() => {
        expect(screen.getByText(/تم إرسال الرمز/)).toBeDefined()
      })

      const otpInputs = screen.getAllByRole('textbox').filter(input =>
        input.getAttribute('maxlength') === '1'
      )

      otpInputs.forEach((input, index) => {
        fireEvent.change(input, { target: { value: (index + 1).toString() } })
      })

      // Step 4: Verify and navigate
      await waitFor(() => {
        expect(authService.verifyOTP).toHaveBeenCalledWith('0512345678', '123456')
      })

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(mockUser, 'test-jwt-token')
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })
  })
})

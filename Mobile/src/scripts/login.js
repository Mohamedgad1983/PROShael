/**
 * Login Page Script - Al-Shuail Mobile PWA
 * Phase 1: Form Handling and Authentication Logic
 *
 * Features:
 * - Phone number validation and OTP flow
 * - OTP input with auto-focus
 * - Timer countdown and resend functionality
 * - Loading states and error handling
 * - Integration with auth-service and token-manager
 */

import authService from '../auth/auth-service.js';
import otpHandler from '../auth/otp-handler.js';
import tokenManager from '../auth/token-manager.js';
import logger from '../utils/logger.js';

// ========================================
// DOM Elements
// ========================================
const phoneStep = document.getElementById('phoneStep');
const otpStep = document.getElementById('otpStep');
const phoneInput = document.getElementById('phoneInput');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const otpDigits = document.querySelectorAll('.otp-digit');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const resendOtpBtn = document.getElementById('resendOtpBtn');
const backToPhoneBtn = document.getElementById('backToPhoneBtn');
const phoneDisplay = document.getElementById('phoneDisplay');
const timerValue = document.getElementById('timerValue');
const phoneError = document.getElementById('phoneError');
const otpError = document.getElementById('otpError');
const loadingOverlay = document.getElementById('loadingOverlay');
const devModeIndicator = document.getElementById('devModeIndicator');
const mockOtpCode = document.getElementById('mockOtpCode');

// ========================================
// State Management
// ========================================
let currentPhone = '';
let otpTimerInterval = null;
let resendCooldownInterval = null;

// ========================================
// Initialize
// ========================================
function init() {
  // Check if already authenticated
  const authStatus = tokenManager.getAuthStatus();
  if (authStatus.isAuthenticated) {
    redirectToDashboard();
    return;
  }

  // Show development mode indicator if mock OTP enabled
  const mockEnabled = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK_OTP_ENABLED === 'true') || true;
  const mockCode = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK_OTP_CODE) || '123456';

  if (mockEnabled) {
    devModeIndicator.style.display = 'flex';
    mockOtpCode.textContent = mockCode;
  }

  // Attach event listeners
  attachEventListeners();

  // Auto-focus phone input
  phoneInput.focus();
}

// ========================================
// Event Listeners
// ========================================
function attachEventListeners() {
  // Phone input events
  phoneInput.addEventListener('input', handlePhoneInput);
  phoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendOtp();
    }
  });

  // Send OTP button
  sendOtpBtn.addEventListener('click', handleSendOtp);

  // OTP digit inputs
  otpDigits.forEach((digit, index) => {
    digit.addEventListener('input', (e) => handleOtpInput(e, index));
    digit.addEventListener('keydown', (e) => handleOtpKeydown(e, index));
    digit.addEventListener('paste', (e) => handleOtpPaste(e, index));
  });

  // Verify OTP button
  verifyOtpBtn.addEventListener('click', handleVerifyOtp);

  // Resend OTP button
  resendOtpBtn.addEventListener('click', handleResendOtp);

  // Back to phone button
  backToPhoneBtn.addEventListener('click', handleBackToPhone);
}

// ========================================
// Phone Input Handling
// ========================================
function handlePhoneInput(e) {
  // Only allow digits
  let value = e.target.value.replace(/\D/g, '');

  // Limit to 10 digits
  if (value.length > 10) {
    value = value.slice(0, 10);
  }

  e.target.value = value;

  // Clear error when typing
  hideError(phoneError);

  // Enable/disable send button
  sendOtpBtn.disabled = value.length !== 10;
}

// ========================================
// Send OTP
// ========================================
async function handleSendOtp() {
  const phone = phoneInput.value.trim();

  // Validate phone number
  if (!authService.validatePhoneNumber(phone)) {
    showError(phoneError, 'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
    return;
  }

  // Show loading
  showLoading(true);
  sendOtpBtn.disabled = true;

  try {
    // Send OTP
    const result = await authService.sendOtp(phone, 'ar');

    if (result.success) {
      // Save phone number
      currentPhone = phone;

      // Create OTP session
      if (result.mockMode) {
        otpHandler.createOtpSession(phone, result.otpCode);
      } else {
        otpHandler.createOtpSession(phone);
      }

      // Switch to OTP step
      switchToOtpStep(phone);

      // Start timer
      startOtpTimer();

    } else {
      showError(phoneError, result.error);
      sendOtpBtn.disabled = false;
    }

  } catch (error) {
    logger.error('[Login] Send OTP error:', { error });
    showError(phoneError, 'حدث خطأ. يرجى المحاولة مرة أخرى');
    sendOtpBtn.disabled = false;
  } finally {
    showLoading(false);
  }
}

// ========================================
// Switch to OTP Step
// ========================================
function switchToOtpStep(phone) {
  // Update phone display
  phoneDisplay.textContent = `+966 ${phone}`;

  // Switch steps
  phoneStep.classList.remove('active');
  otpStep.classList.add('active');

  // Clear OTP inputs
  clearOtpInputs();

  // Focus first OTP digit
  setTimeout(() => {
    otpDigits[0].focus();
  }, 100);
}

// ========================================
// OTP Input Handling
// ========================================
function handleOtpInput(e, index) {
  const value = e.target.value;

  // Only allow single digit
  if (value.length > 1) {
    e.target.value = value.slice(0, 1);
  }

  // Only allow digits
  if (value && !/^\d$/.test(value)) {
    e.target.value = '';
    return;
  }

  // Clear error
  hideError(otpError);

  // Move to next input if value entered
  if (value && index < otpDigits.length - 1) {
    otpDigits[index + 1].focus();
  }

  // Auto-verify if all digits entered
  if (index === otpDigits.length - 1 && value) {
    const allFilled = Array.from(otpDigits).every(digit => digit.value);
    if (allFilled) {
      setTimeout(handleVerifyOtp, 300);
    }
  }
}

function handleOtpKeydown(e, index) {
  // Handle backspace
  if (e.key === 'Backspace' && !e.target.value && index > 0) {
    otpDigits[index - 1].focus();
    otpDigits[index - 1].value = '';
  }

  // Handle Enter key
  if (e.key === 'Enter') {
    e.preventDefault();
    handleVerifyOtp();
  }

  // Handle arrow keys
  if (e.key === 'ArrowLeft' && index < otpDigits.length - 1) {
    otpDigits[index + 1].focus();
  }
  if (e.key === 'ArrowRight' && index > 0) {
    otpDigits[index - 1].focus();
  }
}

function handleOtpPaste(e, index) {
  e.preventDefault();

  // Get pasted text
  const pastedText = (e.clipboardData || window.clipboardData).getData('text');

  // Extract digits
  const digits = pastedText.replace(/\D/g, '').slice(0, 6);

  if (digits.length === 0) {
    return;
  }

  // Fill inputs
  digits.split('').forEach((digit, i) => {
    if (i < otpDigits.length) {
      otpDigits[i].value = digit;
    }
  });

  // Focus last filled digit or last digit
  const lastIndex = Math.min(digits.length - 1, otpDigits.length - 1);
  otpDigits[lastIndex].focus();

  // Auto-verify if all 6 digits pasted
  if (digits.length === 6) {
    setTimeout(handleVerifyOtp, 300);
  }
}

function clearOtpInputs() {
  otpDigits.forEach(digit => {
    digit.value = '';
  });
}

function getOtpValue() {
  return Array.from(otpDigits)
    .map(digit => digit.value)
    .join('');
}

// ========================================
// Verify OTP
// ========================================
async function handleVerifyOtp() {
  const otp = getOtpValue();

  // Validate OTP format
  if (otp.length !== 6) {
    showError(otpError, 'يرجى إدخال رمز التحقق المكون من 6 أرقام');
    return;
  }

  // Show loading
  showLoading(true);
  verifyOtpBtn.disabled = true;

  try {
    // Verify OTP
    const result = await authService.verifyOtp(currentPhone, otp, 'ar');

    if (result.success) {
      // Save authentication data
      tokenManager.saveToken(result.token, result.user, result.refreshToken);

      // Clear OTP session
      otpHandler.clearAllSessions();

      // Stop timers
      stopTimers();

      // Redirect to dashboard
      redirectToDashboard();

    } else {
      showError(otpError, result.error);
      verifyOtpBtn.disabled = false;

      // Clear OTP inputs on error
      clearOtpInputs();
      otpDigits[0].focus();
    }

  } catch (error) {
    logger.error('[Login] Verify OTP error:', { error });
    showError(otpError, 'حدث خطأ. يرجى المحاولة مرة أخرى');
    verifyOtpBtn.disabled = false;
  } finally {
    showLoading(false);
  }
}

// ========================================
// Resend OTP
// ========================================
async function handleResendOtp() {
  // Check cooldown
  const canResend = otpHandler.canResendOtp(currentPhone);

  if (!canResend.canResend) {
    showError(otpError, `يرجى الانتظار ${canResend.remainingTime} ثانية`);
    return;
  }

  // Show loading
  showLoading(true);
  resendOtpBtn.disabled = true;

  try {
    // Resend OTP
    const result = await authService.sendOtp(currentPhone, 'ar');

    if (result.success) {
      // Update OTP session
      otpHandler.updateResendTimestamp(currentPhone);

      // Restart timer
      startOtpTimer();

      // Clear OTP inputs
      clearOtpInputs();
      otpDigits[0].focus();

      // Show success message briefly
      showError(otpError, 'تم إعادة إرسال رمز التحقق بنجاح');
      setTimeout(() => hideError(otpError), 3000);

    } else {
      showError(otpError, result.error);
    }

  } catch (error) {
    logger.error('[Login] Resend OTP error:', { error });
    showError(otpError, 'حدث خطأ. يرجى المحاولة مرة أخرى');
  } finally {
    showLoading(false);
    resendOtpBtn.disabled = true;
  }
}

// ========================================
// Back to Phone Step
// ========================================
function handleBackToPhone() {
  // Stop timers
  stopTimers();

  // Clear OTP session
  otpHandler.clearAllSessions();

  // Switch steps
  otpStep.classList.remove('active');
  phoneStep.classList.add('active');

  // Clear inputs
  clearOtpInputs();
  phoneInput.value = '';

  // Focus phone input
  setTimeout(() => {
    phoneInput.focus();
  }, 100);
}

// ========================================
// OTP Timer
// ========================================
function startOtpTimer() {
  // Clear existing timers
  stopTimers();

  // Start countdown timer
  updateTimerDisplay();

  otpTimerInterval = setInterval(() => {
    const remaining = otpHandler.getExpiryTimeRemaining(currentPhone);

    if (remaining <= 0) {
      stopTimers();
      timerValue.textContent = '00:00';
      timerValue.style.color = '#ef4444';
      showError(otpError, 'انتهت صلاحية رمز التحقق. اضغط على "إعادة إرسال الرمز" أسفل للحصول على رمز جديد');
    } else {
      updateTimerDisplay();
    }
  }, 1000);

  // Start resend cooldown timer
  resendOtpBtn.disabled = true;

  resendCooldownInterval = setInterval(() => {
    const canResend = otpHandler.canResendOtp(currentPhone);

    if (canResend.canResend) {
      resendOtpBtn.disabled = false;
      clearInterval(resendCooldownInterval);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const remaining = otpHandler.getExpiryTimeRemaining(currentPhone);
  const formatted = otpHandler.formatTimeRemaining(remaining);

  timerValue.textContent = formatted;

  // Change color based on time remaining
  if (remaining <= 30) {
    timerValue.style.color = '#ef4444'; // red
  } else if (remaining <= 60) {
    timerValue.style.color = '#f59e0b'; // orange
  } else {
    timerValue.style.color = '#ffffff'; // white
  }
}

function stopTimers() {
  if (otpTimerInterval) {
    clearInterval(otpTimerInterval);
    otpTimerInterval = null;
  }

  if (resendCooldownInterval) {
    clearInterval(resendCooldownInterval);
    resendCooldownInterval = null;
  }
}

// ========================================
// UI Helpers
// ========================================
function showError(errorElement, message) {
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

function hideError(errorElement) {
  errorElement.textContent = '';
  errorElement.style.display = 'none';
}

function showLoading(show) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
}

function redirectToDashboard() {
  // Add a small delay for smooth transition
  setTimeout(() => {
    window.location.href = '/dashboard.html';
  }, 500);
}

// ========================================
// Initialize on DOM Ready
// ========================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

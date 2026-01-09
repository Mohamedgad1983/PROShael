/**
 * Login Page - WhatsApp OTP Authentication
 * صفحة تسجيل الدخول - التحقق عبر WhatsApp
 * 
 * Updated: December 2, 2025
 * Flow:
 * 1. Enter phone number
 * 2. Receive OTP via WhatsApp
 * 3. Enter OTP to login
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Shield, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../App'
import { authService } from '../services'

// OTP Configuration
const OTP_LENGTH = 6
const OTP_EXPIRY_SECONDS = 300 // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60

const Login = () => {
  // Navigation and auth
  const navigate = useNavigate()
  const { login } = useAuth()
  
  // Step management
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  
  // Phone step state
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [sendingOTP, setSendingOTP] = useState(false)
  const [memberName, setMemberName] = useState('')
  
  // OTP step state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [verifying, setVerifying] = useState(false)
  
  // Timers
  const [expiryTime, setExpiryTime] = useState(OTP_EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)
  
  // OTP input refs
  const otpInputRefs = useRef([])

  // Countdown timers
  useEffect(() => {
    let interval
    if (step === 'otp') {
      interval = setInterval(() => {
        setExpiryTime(prev => {
          if (prev <= 0) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
        
        setResendCooldown(prev => {
          if (prev <= 0) return 0
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step])

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Validate phone number
  const validatePhone = (phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    
    // Saudi: 05xxxxxxxx (10 digits) or 5xxxxxxxx (9 digits)
    // Kuwait: 9xxxxxxx (8 digits) or 6xxxxxxx (8 digits)
    if (cleanPhone.length === 10 && cleanPhone.startsWith('05')) {
      return true
    }
    if (cleanPhone.length === 9 && cleanPhone.startsWith('5')) {
      return true
    }
    if (cleanPhone.length === 8 && (/^[569]/.test(cleanPhone))) {
      return true
    }
    // With country code
    if (cleanPhone.startsWith('966') && cleanPhone.length === 12) {
      return true
    }
    if (cleanPhone.startsWith('965') && cleanPhone.length === 11) {
      return true
    }
    
    return false
  }

  // Handle send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setPhoneError('')
    
    // Validate phone
    if (!phone || !validatePhone(phone)) {
      setPhoneError('يرجى إدخال رقم هاتف صحيح')
      return
    }
    
    setSendingOTP(true)
    
    try {
      const response = await authService.sendOTP(phone)
      
      if (response.success) {
        // Store member name if returned
        if (response.memberName) {
          setMemberName(response.memberName)
        }
        
        // Move to OTP step
        setStep('otp')
        setExpiryTime(response.expiresIn || OTP_EXPIRY_SECONDS)
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        
        // Focus first OTP input
        setTimeout(() => {
          otpInputRefs.current[0]?.focus()
        }, 100)
      } else {
        setPhoneError(response.message || 'فشل إرسال رمز التحقق')
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      setPhoneError(error.response?.data?.message || 'حدث خطأ في إرسال رمز التحقق')
    } finally {
      setSendingOTP(false)
    }
  }

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setOtpError('')
    
    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus()
    }
    
    // Auto-submit when complete
    if (value && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('')
      if (fullOtp.length === OTP_LENGTH) {
        handleVerifyOTP(fullOtp)
      }
    }
  }

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    
    if (pastedData.length === OTP_LENGTH) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      otpInputRefs.current[OTP_LENGTH - 1]?.focus()
      handleVerifyOTP(pastedData)
    }
  }

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  // Handle verify OTP
  const handleVerifyOTP = async (otpCode) => {
    const code = otpCode || otp.join('')
    
    if (code.length !== OTP_LENGTH) {
      setOtpError('يرجى إدخال رمز التحقق كاملاً')
      return
    }
    
    if (expiryTime <= 0) {
      setOtpError('انتهت صلاحية رمز التحقق. يرجى إعادة الإرسال')
      return
    }
    
    setVerifying(true)
    setOtpError('')
    
    try {
      const response = await authService.verifyOTP(phone, code)
      
      if (response.success) {
        // Login successful
        login(response.user)
        navigate('/dashboard')
      } else {
        setOtpError(response.message || 'رمز التحقق غير صحيح')
        // Clear OTP inputs
        setOtp(['', '', '', '', '', ''])
        otpInputRefs.current[0]?.focus()
      }
    } catch (error) {
      console.error('Verify OTP error:', error)
      setOtpError(error.response?.data?.message || 'حدث خطأ في التحقق')
      setOtp(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return
    
    setSendingOTP(true)
    
    try {
      const response = await authService.resendOTP(phone)
      
      if (response.success) {
        setExpiryTime(response.expiresIn || OTP_EXPIRY_SECONDS)
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        setOtp(['', '', '', '', '', ''])
        setOtpError('')
        otpInputRefs.current[0]?.focus()
      } else {
        setOtpError(response.message || 'فشل إعادة الإرسال')
      }
    } catch (error) {
      setOtpError('حدث خطأ في إعادة الإرسال')
    } finally {
      setSendingOTP(false)
    }
  }

  // Go back to phone step
  const handleBack = () => {
    setStep('phone')
    setOtp(['', '', '', '', '', ''])
    setOtpError('')
    setExpiryTime(OTP_EXPIRY_SECONDS)
  }

  // Demo login for testing
  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-001',
      membership_id: 'SH-0001',
      full_name_ar: 'محمد أحمد الشعيل',
      full_name_en: 'Mohammed Ahmed Al-Shuail',
      name: 'محمد أحمد الشعيل',
      phone: '+966501234567',
      branch_name: 'فخذ رشود',
      branchName: 'فخذ رشود',
      balance: 2500,
      status: 'active',
      membershipNumber: 'SH-0001',
      join_date: '1446/01/15'
    }
    localStorage.setItem('alshuail_user', JSON.stringify(demoUser))
    localStorage.setItem('alshuail_token', 'demo-token')
    login(demoUser)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen gradient-primary flex flex-col items-center justify-center p-5">
      {/* Logo */}
      <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl p-2">
        <img src="/logo.png" alt="شعار صندوق شعيل" className="w-full h-full object-contain" />
      </div>
      
      <h1 className="text-xl font-bold text-white text-center mb-1">صندوق عائلة شعيل العنزي</h1>
      <p className="text-white/80 text-sm mb-8">Shuail Al-Anzi Family Fund</p>
      
      {/* Login Card */}
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
        
        {/* Step 1: Phone Input */}
        {step === 'phone' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">مرحباً بك</h2>
              <p className="text-gray-500 text-sm mt-1">أدخل رقم هاتفك للتسجيل عبر WhatsApp</p>
            </div>
            
            {phoneError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{phoneError}</span>
              </div>
            )}
            
            <form onSubmit={handleSendOTP}>
              <div className="mb-5">
                <label className="block text-gray-600 text-sm mb-2 font-medium">رقم الهاتف</label>
                <div className="relative">
                  <input
                    type="tel"
                    className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="05xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={15}
                    disabled={sendingOTP}
                    dir="ltr"
                    autoComplete="tel"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Phone size={20} className="text-gray-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-2">🇸🇦 السعودية أو 🇰🇼 الكويت</p>
              </div>
              
              <button 
                type="submit" 
                className="btn-primary"
                disabled={sendingOTP}
              >
                {sendingOTP ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>جاري الإرسال...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>إرسال رمز التحقق</span>
                    <ArrowLeft size={20} />
                  </div>
                )}
              </button>
            </form>
            
            {/* WhatsApp Info */}
            <div className="mt-5 p-3 bg-green-50 rounded-xl border border-green-100">
              <p className="text-green-700 text-xs text-center flex items-center justify-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>سيتم إرسال رمز التحقق عبر WhatsApp</span>
              </p>
            </div>
          </>
        )}
        
        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">أدخل رمز التحقق</h2>
              <p className="text-gray-500 text-sm mt-1">
                تم إرسال رمز التحقق إلى
              </p>
              <p className="text-primary-600 font-bold mt-1" dir="ltr">{phone}</p>
              {memberName && (
                <p className="text-green-600 text-sm mt-2 flex items-center justify-center gap-1">
                  <CheckCircle size={16} />
                  <span>{memberName}</span>
                </p>
              )}
            </div>
            
            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{otpError}</span>
              </div>
            )}
            
            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-4" dir="ltr">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => otpInputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  disabled={verifying}
                />
              ))}
            </div>
            
            {/* Timer */}
            <div className="text-center mb-4">
              {expiryTime > 0 ? (
                <p className="text-gray-500 text-sm">
                  صالح لمدة <span className="font-bold text-primary-600">{formatTime(expiryTime)}</span>
                </p>
              ) : (
                <p className="text-red-500 text-sm font-bold">
                  انتهت صلاحية الرمز
                </p>
              )}
            </div>
            
            {/* Verify Button */}
            <button 
              onClick={() => handleVerifyOTP()}
              className="btn-primary mb-3"
              disabled={verifying || otp.join('').length !== OTP_LENGTH}
            >
              {verifying ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle size={20} />
                  <span>تأكيد</span>
                </div>
              )}
            </button>
            
            {/* Resend Button */}
            <button 
              onClick={handleResendOTP}
              className="w-full py-3 text-primary-600 text-sm font-medium hover:bg-gray-50 rounded-xl transition flex items-center justify-center gap-2"
              disabled={resendCooldown > 0 || sendingOTP}
            >
              {sendingOTP ? (
                <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
              ) : (
                <RefreshCw size={16} className={resendCooldown > 0 ? 'opacity-50' : ''} />
              )}
              {resendCooldown > 0 ? (
                <span>إعادة الإرسال بعد {resendCooldown} ثانية</span>
              ) : (
                <span>إعادة إرسال الرمز</span>
              )}
            </button>
            
            {/* Change Number */}
            <button 
              onClick={handleBack}
              className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
            >
              تغيير رقم الهاتف
            </button>
          </>
        )}
        
        {/* Demo Login - Only in phone step */}
        {step === 'phone' && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-3 text-gray-400 text-sm font-medium hover:bg-gray-50 rounded-xl transition"
            >
              🧪 دخول تجريبي (للمعاينة)
            </button>
          </div>
        )}
      </div>
      
      <p className="text-white/50 text-xs mt-8">جميع الحقوق محفوظة © 2024</p>
    </div>
  )
}

export default Login

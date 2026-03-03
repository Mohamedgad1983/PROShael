/**
 * Login Page - Phone + Password Authentication
 * صفحة تسجيل الدخول - رقم الهاتف وكلمة المرور
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '../App'
import { authService } from '../services'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Validate phone number
  const validatePhone = (phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '')

    // Saudi: 05xxxxxxxx (10 digits) or 5xxxxxxxx (9 digits)
    if (cleanPhone.length === 10 && cleanPhone.startsWith('05')) return true
    if (cleanPhone.length === 9 && cleanPhone.startsWith('5')) return true
    // Kuwait: 9xxxxxxx or 6xxxxxxx or 5xxxxxxx (8 digits)
    if (cleanPhone.length === 8 && /^[569]/.test(cleanPhone)) return true
    // With country code
    if (cleanPhone.startsWith('966') && cleanPhone.length === 12) return true
    if (cleanPhone.startsWith('965') && cleanPhone.length === 11) return true

    return false
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!phone || !validatePhone(phone)) {
      setError('يرجى إدخال رقم هاتف صحيح')
      return
    }

    if (!password) {
      setError('يرجى إدخال كلمة المرور')
      return
    }

    setLoading(true)

    try {
      const response = await authService.mobileLogin(phone, password)

      if (response.success) {
        // Store token
        localStorage.setItem('alshuail_token', response.token)
        // Login with password change flag
        login(response.user, response.requires_password_change)

        if (response.requires_password_change) {
          navigate('/change-password', { state: { isFirstLogin: true } })
        } else {
          navigate('/dashboard')
        }
      } else {
        // Show Arabic error message from server
        if (response.locked_until) {
          setError(response.message || 'الحساب مقفل مؤقتاً. يرجى المحاولة لاحقاً')
        } else {
          setError(response.message || 'رقم الهاتف أو كلمة المرور غير صحيحة')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.response?.data?.message || 'حدث خطأ في تسجيل الدخول')
    } finally {
      setLoading(false)
    }
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
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">مرحباً بك</h2>
          <p className="text-gray-500 text-sm mt-1">أدخل رقم هاتفك وكلمة المرور</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Phone Number */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm mb-2 font-medium">رقم الهاتف</label>
            <div className="relative">
              <input
                type="tel"
                className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="05xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={15}
                disabled={loading}
                dir="ltr"
                autoComplete="tel"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Phone size={20} className="text-gray-400" />
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2">🇸🇦 السعودية أو 🇰🇼 الكويت</p>
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="block text-gray-600 text-sm mb-2 font-medium">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                dir="ltr"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff size={20} className="text-gray-400" />
                ) : (
                  <Eye size={20} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>جاري تسجيل الدخول...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>تسجيل الدخول</span>
              </div>
            )}
          </button>
        </form>
      </div>

      <p className="text-white/50 text-xs mt-8">جميع الحقوق محفوظة © 2024</p>
    </div>
  )
}

export default Login

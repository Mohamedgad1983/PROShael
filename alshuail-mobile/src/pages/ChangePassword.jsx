/**
 * Change Password Page
 * صفحة تغيير كلمة المرور
 *
 * Handles both:
 * - Forced password change on first login (isFirstLogin)
 * - Voluntary password change from Settings
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle, Lock, Shield } from 'lucide-react'
import { useAuth } from '../App'
import { authService } from '../services'

const ChangePassword = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearPasswordChangeFlag } = useAuth()

  const isFirstLogin = location.state?.isFirstLogin || false

  const [currentPassword, setCurrentPassword] = useState(isFirstLogin ? '123456' : '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password strength checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    notTemp: newPassword !== '123456'
  }
  const allChecksPassed = checks.length && checks.uppercase && checks.lowercase && checks.number && checks.notTemp
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword

  // Block back navigation on first login
  useEffect(() => {
    if (!isFirstLogin) return

    const handlePopState = (e) => {
      e.preventDefault()
      window.history.pushState(null, '', window.location.pathname)
    }

    window.history.pushState(null, '', window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isFirstLogin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!currentPassword) {
      setError('يرجى إدخال كلمة المرور الحالية')
      return
    }

    if (!allChecksPassed) {
      setError('كلمة المرور الجديدة لا تستوفي المتطلبات')
      return
    }

    if (!passwordsMatch) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقتين')
      return
    }

    setLoading(true)

    try {
      const response = await authService.changePassword(currentPassword, newPassword)

      if (response.success) {
        clearPasswordChangeFlag()
        navigate('/dashboard', { replace: true })
      } else {
        setError(response.message || 'فشل تغيير كلمة المرور')
      }
    } catch (error) {
      console.error('Change password error:', error)
      setError(error.response?.data?.message || 'حدث خطأ في تغيير كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  const PasswordCheck = ({ passed, label }) => (
    <div className="flex items-center gap-2 text-sm">
      {passed ? (
        <CheckCircle size={16} className="text-green-500" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
      )}
      <span className={passed ? 'text-green-600' : 'text-gray-500'}>{label}</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="page-header-with-back">
        {!isFirstLogin && (
          <div className="back-btn" onClick={() => navigate(-1)}>
            <ArrowRight size={20} className="text-white" />
          </div>
        )}
        <h2 className="text-xl font-bold">
          {isFirstLogin ? 'تعيين كلمة مرور جديدة' : 'تغيير كلمة المرور'}
        </h2>
      </div>

      <div className="page-content">
        {/* First login notice */}
        {isFirstLogin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Shield size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-semibold text-sm">تغيير كلمة المرور مطلوب</p>
              <p className="text-amber-600 text-xs mt-1">
                يجب تغيير كلمة المرور المؤقتة قبل الوصول إلى التطبيق
              </p>
            </div>
          </div>
        )}

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <div className="mb-4">
              <label className="block text-gray-600 text-sm mb-2 font-medium">كلمة المرور الحالية</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder={isFirstLogin ? '123456' : 'أدخل كلمة المرور الحالية'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff size={18} className="text-gray-400" /> : <Eye size={18} className="text-gray-400" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="mb-4">
              <label className="block text-gray-600 text-sm mb-2 font-medium">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="أدخل كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={18} className="text-gray-400" /> : <Eye size={18} className="text-gray-400" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-3 space-y-1.5 bg-gray-50 rounded-lg p-3">
                  <PasswordCheck passed={checks.length} label="8 أحرف على الأقل" />
                  <PasswordCheck passed={checks.uppercase} label="حرف كبير واحد على الأقل (A-Z)" />
                  <PasswordCheck passed={checks.lowercase} label="حرف صغير واحد على الأقل (a-z)" />
                  <PasswordCheck passed={checks.number} label="رقم واحد على الأقل (0-9)" />
                  <PasswordCheck passed={checks.notTemp} label="ليست كلمة المرور المؤقتة" />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-gray-600 text-sm mb-2 font-medium">تأكيد كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} className="text-gray-400" /> : <Eye size={18} className="text-gray-400" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle size={14} />
                  كلمة المرور غير متطابقة
                </p>
              )}
              {passwordsMatch && (
                <p className="text-green-500 text-xs mt-2 flex items-center gap-1">
                  <CheckCircle size={14} />
                  كلمة المرور متطابقة
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !allChecksPassed || !passwordsMatch}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جاري التغيير...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Lock size={20} />
                  <span>تغيير كلمة المرور</span>
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword

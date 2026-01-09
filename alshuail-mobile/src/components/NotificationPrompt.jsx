/**
 * Notification Permission Prompt
 * صندوق عائلة شعيل العنزي
 * 
 * Prompts user to enable push notifications after login
 */

import { useState, useEffect } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { pushNotificationService } from '../services'

const NotificationPrompt = ({ memberId, onComplete }) => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    // Check if we should show the prompt
    const checkNotifications = () => {
      // Don't show if notifications already enabled
      if (pushNotificationService.isNotificationsEnabled()) {
        return
      }

      // Don't show if permission was denied
      if (pushNotificationService.getPermissionStatus() === 'denied') {
        return
      }

      // Don't show if user dismissed recently
      const dismissedAt = localStorage.getItem('notification_prompt_dismissed')
      if (dismissedAt) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
        if (daysSinceDismissed < 7) { // Don't show for 7 days after dismiss
          return
        }
      }

      // Check if push is supported
      if (!pushNotificationService.isPushSupported()) {
        return
      }

      // Show prompt after short delay
      setTimeout(() => setVisible(true), 2000)
    }

    checkNotifications()
  }, [])

  const handleEnable = async () => {
    setLoading(true)
    
    try {
      const result = await pushNotificationService.setupPushNotifications(memberId)
      
      if (result.success) {
        setStatus('success')
        // Show test notification
        setTimeout(() => {
          pushNotificationService.showTestNotification()
        }, 500)
        // Auto hide after success
        setTimeout(() => {
          setVisible(false)
          onComplete?.(true)
        }, 2000)
      } else {
        setStatus('error')
        console.error('Failed to enable notifications:', result)
      }
    } catch (error) {
      setStatus('error')
      console.error('Error enabling notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('notification_prompt_dismissed', Date.now().toString())
    setVisible(false)
    onComplete?.(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-20 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm pointer-events-auto animate-slideUp">
        {/* Close button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 left-3 p-2 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
          status === 'success' 
            ? 'bg-green-100' 
            : status === 'error' 
              ? 'bg-red-100' 
              : 'bg-gradient-to-br from-primary-400 to-purple-500'
        }`}>
          {status === 'success' ? (
            <Check size={32} className="text-green-600" />
          ) : status === 'error' ? (
            <X size={32} className="text-red-600" />
          ) : (
            <Bell size={32} className="text-white" />
          )}
        </div>

        {/* Content */}
        {status === 'success' ? (
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">تم تفعيل الإشعارات! ✅</h3>
            <p className="text-gray-500 text-sm">ستصلك الإشعارات الآن بكل جديد</p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">تعذر التفعيل</h3>
            <p className="text-gray-500 text-sm mb-4">يرجى المحاولة مرة أخرى أو التحقق من إعدادات المتصفح</p>
            <button 
              onClick={() => setStatus(null)}
              className="text-primary-600 text-sm font-medium"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-gray-800 mb-2">تفعيل الإشعارات 🔔</h3>
              <p className="text-gray-500 text-sm">
                فعّل الإشعارات ليصلك تنبيه بـ:
              </p>
              <ul className="text-gray-600 text-sm mt-3 space-y-1">
                <li>📅 تذكير بموعد الاشتراك</li>
                <li>🎉 المناسبات والفعاليات</li>
                <li>📢 الإعلانات الهامة</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 py-3 text-gray-500 text-sm font-medium hover:bg-gray-50 rounded-xl transition"
              >
                لاحقاً
              </button>
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Bell size={18} />
                    <span>تفعيل</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default NotificationPrompt

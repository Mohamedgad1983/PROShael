import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, Moon, Globe, Phone, FileText, Info, ChevronLeft, LogOut, Check, X } from 'lucide-react'
import { useAuth } from '../App'
import { pushNotificationService } from '../services'

const Settings = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Check notification status on mount
  useEffect(() => {
    const checkNotificationStatus = () => {
      const enabled = pushNotificationService.isNotificationsEnabled()
      setNotifications(enabled)
    }
    checkNotificationStatus()
  }, [])

  const handleNotificationToggle = async () => {
    if (notifications) {
      // Disable notifications
      const token = localStorage.getItem('fcm_token')
      if (token) {
        await pushNotificationService.unregisterDeviceToken(token)
        localStorage.removeItem('fcm_token')
      }
      setNotifications(false)
    } else {
      // Enable notifications
      setNotificationLoading(true)
      try {
        const result = await pushNotificationService.setupPushNotifications(user?.id || user?.member_id)
        if (result.success) {
          setNotifications(true)
          pushNotificationService.showTestNotification()
        } else {
          alert(result.error || 'فشل تفعيل الإشعارات')
        }
      } catch (error) {
        console.error('Notification toggle error:', error)
        alert('حدث خطأ في تفعيل الإشعارات')
      } finally {
        setNotificationLoading(false)
      }
    }
  }

  const handleLogout = () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      // Unregister push notifications on logout
      const token = localStorage.getItem('fcm_token')
      if (token) {
        pushNotificationService.unregisterDeviceToken(token)
        localStorage.removeItem('fcm_token')
      }
      logout()
      navigate('/login')
    }
  }

  const getNotificationStatusText = () => {
    const permission = pushNotificationService.getPermissionStatus()
    if (permission === 'denied') {
      return 'محظورة في المتصفح'
    }
    if (notifications) {
      return 'مفعّلة'
    }
    return 'غير مفعّلة'
  }

  const settingsGroups = [
    {
      title: 'الإعدادات العامة',
      items: [
        {
          icon: Bell,
          label: 'الإشعارات',
          subtitle: getNotificationStatusText(),
          type: 'toggle',
          value: notifications,
          loading: notificationLoading,
          onChange: handleNotificationToggle,
          disabled: pushNotificationService.getPermissionStatus() === 'denied'
        },
        {
          icon: Moon,
          label: 'الوضع الليلي',
          subtitle: darkMode ? 'مفعّل' : 'غير مفعّل',
          type: 'toggle',
          value: darkMode,
          onChange: () => setDarkMode(!darkMode)
        },
        {
          icon: Globe,
          label: 'اللغة',
          subtitle: 'العربية',
          type: 'link'
        }
      ]
    },
    {
      title: 'المساعدة والدعم',
      items: [
        {
          icon: Phone,
          label: 'تواصل معنا',
          subtitle: 'للدعم والاستفسارات',
          type: 'link'
        },
        {
          icon: FileText,
          label: 'الشروط والأحكام',
          type: 'link'
        },
        {
          icon: Info,
          label: 'عن التطبيق',
          subtitle: 'الإصدار 2.0.0',
          type: 'link'
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="page-header-with-back">
        <div className="back-btn" onClick={() => navigate(-1)}>
          <ArrowRight size={20} className="text-white" />
        </div>
        <h2 className="text-xl font-bold">الإعدادات</h2>
      </div>

      <div className="page-content">
        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            <h3 className="text-gray-500 text-xs font-semibold mb-2 px-1">{group.title}</h3>
            <div className="card">
              {group.items.map((item, itemIndex) => {
                const Icon = item.icon
                return (
                  <div 
                    key={itemIndex}
                    className={`flex items-center justify-between py-3 ${
                      itemIndex !== group.items.length - 1 ? 'border-b border-gray-100' : ''
                    } ${item.disabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        item.value && item.type === 'toggle' 
                          ? 'bg-gradient-to-r from-primary-500 to-purple-500' 
                          : 'bg-gray-100'
                      }`}>
                        <Icon size={18} className={item.value && item.type === 'toggle' ? 'text-white' : 'text-gray-600'} />
                      </div>
                      <div>
                        <div className="text-gray-800 text-sm font-medium">{item.label}</div>
                        {item.subtitle && (
                          <div className={`text-xs ${
                            item.value && item.type === 'toggle' ? 'text-green-500' : 'text-gray-400'
                          }`}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {item.type === 'toggle' ? (
                      <button
                        onClick={item.onChange}
                        disabled={item.disabled || item.loading}
                        className={`w-12 h-7 rounded-full transition-colors relative ${
                          item.value ? 'bg-gradient-to-r from-primary-500 to-purple-500' : 'bg-gray-200'
                        } ${item.disabled ? 'cursor-not-allowed' : ''}`}
                      >
                        {item.loading ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <div 
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              item.value ? 'right-1' : 'left-1'
                            }`}
                          />
                        )}
                      </button>
                    ) : (
                      <ChevronLeft size={18} className="text-gray-300" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Notification Permission Warning */}
        {pushNotificationService.getPermissionStatus() === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-700 text-sm">
              ⚠️ الإشعارات محظورة في إعدادات المتصفح. يرجى تفعيلها من إعدادات المتصفح للحصول على التنبيهات.
            </p>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-white border-2 border-red-200 text-red-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition hover:bg-red-50"
        >
          <LogOut size={20} />
          تسجيل الخروج
        </button>

        {/* App Version */}
        <p className="text-center text-gray-300 text-xs mt-6">
          صندوق عائلة شعيل العنزي
          <br />
          الإصدار 2.0.0 - WhatsApp + Push
        </p>
      </div>
    </div>
  )
}

export default Settings

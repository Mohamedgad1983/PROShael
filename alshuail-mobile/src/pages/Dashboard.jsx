import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Users, Heart, BadgeCheck, Bell, RefreshCw, Calendar } from 'lucide-react'
import { useAuth } from '../App'
import { useDataCache } from '../contexts/DataCacheContext'
import BottomNav from '../components/BottomNav'
import NotificationPrompt from '../components/NotificationPrompt'
import FundBalanceWidget from '../components/FundBalanceWidget'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { fetchDashboard, cache, getCacheStatus } = useDataCache()
  
  // State - using cached data if available
  const [balance, setBalance] = useState(cache.dashboard?.data?.profile?.current_balance || cache.dashboard?.data?.profile?.balance || user?.balance || 0)
  const [lastPayment, setLastPayment] = useState('-')
  const [status, setStatus] = useState('نشط')
  const [notificationCount, setNotificationCount] = useState(cache.dashboard?.data?.notificationCount || 0)
  const [loading, setLoading] = useState(!cache.dashboard?.data) // Only loading if no cache
  const [refreshing, setRefreshing] = useState(false)
  const [recentNews, setRecentNews] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [error, setError] = useState(null)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true)

  // Fetch dashboard data with caching
  const loadDashboardData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    }
    
    setError(null)

    try {
      const result = await fetchDashboard(forceRefresh)
      
      if (result.data) {
        const data = result.data
        
        // Update profile data
        if (data.profile) {
          setBalance(data.profile.current_balance || data.profile.balance || 0)
          setStatus(data.profile.membership_status === 'active' ? 'نشط' : 'غير نشط')
        } else if (user) {
          setBalance(user.balance || 0)
        }
        
        // Update subscriptions/last payment
        if (data.subscriptions?.length > 0) {
          const lastSub = data.subscriptions[0]
          setLastPayment(lastSub.payment_date || lastSub.created_at?.split('T')[0] || '-')
          
          // Set recent activity from subscriptions
          setRecentActivity(data.subscriptions.slice(0, 3).map(p => ({
            id: p.id,
            title: p.description || 'دفعة اشتراك',
            date: p.payment_date || p.created_at?.split('T')[0],
            amount: p.amount
          })))
        }
        
        // Update notifications
        setNotificationCount(data.notificationCount || 0)
        
        // Update news
        if (data.recentNews) {
          setRecentNews({
            id: data.recentNews.id,
            title: data.recentNews.title_ar || data.recentNews.title,
            body: data.recentNews.content_ar?.substring(0, 50) + '...' || '',
            date: data.recentNews.publish_date?.split('T')[0] || ''
          })
        }
        
        // Log cache status
        if (result.fromCache) {
          console.log('📦 Dashboard loaded from cache (instant!)')
        } else {
          console.log('🌐 Dashboard loaded from API')
        }
      }
      
      if (result.error) {
        setError('حدث خطأ في تحميل البيانات')
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load - use cache if available
  useEffect(() => {
    const cacheStatus = getCacheStatus('dashboard')
    
    if (cacheStatus.hasData && cacheStatus.isFresh) {
      // Use cached data immediately - no loading!
      console.log('⚡ Using cached dashboard data')
      setLoading(false)
      
      const data = cache.dashboard.data
      if (data?.profile) {
        setBalance(data.profile.current_balance || data.profile.balance || 0)
        setStatus(data.profile.membership_status === 'active' ? 'نشط' : 'غير نشط')
      }
      if (data?.subscriptions?.length > 0) {
        const lastSub = data.subscriptions[0]
        setLastPayment(lastSub.payment_date || lastSub.created_at?.split('T')[0] || '-')
        setRecentActivity(data.subscriptions.slice(0, 3).map(p => ({
          id: p.id,
          title: p.description || 'دفعة اشتراك',
          date: p.payment_date || p.created_at?.split('T')[0],
          amount: p.amount
        })))
      }
      setNotificationCount(data?.notificationCount || 0)
      if (data?.recentNews) {
        setRecentNews({
          id: data.recentNews.id,
          title: data.recentNews.title_ar || data.recentNews.title,
          body: data.recentNews.content_ar?.substring(0, 50) + '...' || '',
          date: data.recentNews.publish_date?.split('T')[0] || ''
        })
      }
      
      // Background refresh if data is getting old
      if (!cacheStatus.isFresh) {
        loadDashboardData(false)
      }
    } else {
      // No cache - fetch fresh data
      loadDashboardData(false)
    }
  }, [])

  const quickActions = [
    { icon: CreditCard, label: 'الاشتراكات', path: '/payments', color: 'from-primary-500 to-purple-500' },
    { icon: Users, label: 'شجرة العائلة', path: '/family-tree', color: 'from-primary-500 to-purple-500' },
    { icon: Calendar, label: 'المناسبات', path: '/events', color: 'from-primary-500 to-purple-500' },
    { icon: BadgeCheck, label: 'بطاقة العضو', path: '/member-card', color: 'from-primary-500 to-purple-500' },
    { icon: Heart, label: 'المبادرات', path: '/initiatives', color: 'from-primary-500 to-purple-500' },
  ]

  // Format date to Arabic
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ar-SA')
    } catch {
      return dateStr
    }
  }

  // Format time ago
  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return 'اليوم'
      if (diffDays === 1) return 'منذ يوم'
      if (diffDays < 7) return `منذ ${diffDays} أيام`
      if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`
      return `منذ ${Math.floor(diffDays / 30)} شهر`
    } catch {
      return ''
    }
  }

  // Show loading only on first load without cache
  if (loading && !cache.dashboard?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="text-center text-white">
          <div className="spinner mx-auto mb-4"></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">مرحباً، {user?.name?.split(' ')[0] || user?.full_name_ar?.split(' ')[0] || user?.fullName?.split(' ')[0] || 'عضو'} 👋</h2>
            <p className="text-white/80 text-sm mt-1">نتمنى لك يوماً سعيداً</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => loadDashboardData(true)}
              className={`p-2 bg-white/20 rounded-full ${refreshing ? 'animate-spin' : ''}`}
              disabled={refreshing}
            >
              <RefreshCw size={20} className="text-white" />
            </button>
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-2 bg-white/20 rounded-full"
            >
              <Bell size={20} className="text-white" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {/* Balance Card */}
        <div className="card mb-5 animate-fadeIn">
          <div className="text-gray-500 text-sm mb-1">رصيدك الحالي</div>
          <div className="text-3xl font-bold text-gray-800">
            <span className="text-primary-500 text-lg ml-1">ر.س</span>
            {Number(balance || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-gray-400 text-xs">آخر دفعة</div>
              <div className="text-gray-800 text-sm font-semibold mt-1">{formatDate(lastPayment)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">الحالة</div>
              <div className={`text-sm font-semibold mt-1 ${status === 'نشط' ? 'status-active' : 'status-inactive'}`}>
                {status} {status === 'نشط' && '✓'}
              </div>
            </div>
          </div>
        </div>

        {/* Fund Balance Widget - Shows only for authorized users (admins/financial managers) */}
        <FundBalanceWidget />

        {/* Quick Actions - Now with 5 items, will show 3+2 layout */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {quickActions.slice(0, 3).map((action, index) => {
            const Icon = action.icon
            return (
              <div
                key={index}
                className="card-sm text-center touch-feedback cursor-pointer animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(action.path)}
              >
                <div className="action-icon mx-auto mb-2">
                  <Icon size={20} className="text-white" />
                </div>
                <div className="text-gray-800 text-xs font-semibold">{action.label}</div>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.slice(3).map((action, index) => {
            const Icon = action.icon
            return (
              <div
                key={index + 3}
                className="card-sm text-center touch-feedback cursor-pointer animate-fadeIn"
                style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                onClick={() => navigate(action.path)}
              >
                <div className="action-icon mx-auto mb-2">
                  <Icon size={20} className="text-white" />
                </div>
                <div className="text-gray-800 text-xs font-semibold">{action.label}</div>
              </div>
            )
          })}
        </div>

        {/* Recent News Section */}
        {recentNews && (
          <div className="mt-6 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-800 font-semibold">📰 آخر الأخبار</h3>
              <button 
                onClick={() => navigate('/news')}
                className="text-primary-500 text-sm font-medium"
              >
                عرض الكل
              </button>
            </div>
            <div 
              className="card-sm touch-feedback cursor-pointer"
              onClick={() => navigate('/news')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-gray-800 text-sm font-semibold">{recentNews.title}</div>
                  <div className="text-gray-500 text-xs mt-1">{recentNews.body}</div>
                </div>
                <span className="text-gray-400 text-xs">{formatDate(recentNews.date)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Section */}
        <div className="mt-6 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-gray-800 font-semibold mb-3">آخر النشاطات</h3>
          <div className="card-sm">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div 
                  key={activity.id || index}
                  className={`flex items-center justify-between py-2 ${index < recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <div>
                    <div className="text-gray-800 text-sm font-medium">{activity.title}</div>
                    <div className="text-gray-400 text-xs">{timeAgo(activity.date)}</div>
                  </div>
                  <div className="text-primary-500 font-semibold">{activity.amount} ر.س</div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                لا توجد نشاطات حديثة
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav notificationCount={notificationCount} />

      {/* Push Notification Permission Prompt */}
      {showNotificationPrompt && (
        <NotificationPrompt 
          memberId={user?.id || user?.member_id}
          onComplete={(enabled) => {
            setShowNotificationPrompt(false)
            if (enabled) {
              console.log('✅ Push notifications enabled')
            }
          }}
        />
      )}
    </div>
  )
}

export default Dashboard

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Settings, HelpCircle, FileText, BadgeCheck, Edit, RefreshCw } from 'lucide-react'
import { useAuth } from '../App'
import { useDataCache } from '../contexts/DataCacheContext'
import BottomNav from '../components/BottomNav'

const Profile = () => {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const { fetchProfile, cache } = useDataCache()

  const [profileData, setProfileData] = useState({
    name: user?.full_name_ar || user?.name || '',
    membershipId: user?.membership_id || user?.membershipNumber || '',
    phone: user?.phone || '',
    status: 'نشط',
    joinDate: user?.join_date || user?.created_at || '',
    branch: user?.branch_name || user?.tribal_section || '',
    balance: user?.balance || 0
  })
  const [loading, setLoading] = useState(!cache.profile?.data)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    try {
      const result = await fetchProfile(forceRefresh)
      if (result.data) {
        const data = result.data
        setProfileData({
          name: data.full_name_ar || data.name || user?.full_name_ar || '',
          membershipId: data.membership_id || data.membershipNumber || user?.membership_id || '',
          phone: data.phone || user?.phone || '',
          status: data.membership_status === 'active' || data.status === 'active' ? 'نشط' : 'غير نشط',
          joinDate: data.join_date || data.created_at || user?.join_date || '',
          branch: data.branch_name || data.tribal_section || user?.branch_name || '',
          balance: data.balance ?? user?.balance ?? 0
        })
        updateUser({
          phone: data.phone,
          name: data.full_name_ar || data.name,
          balance: data.balance,
          branch_name: data.branch_name || data.tribal_section
        })
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      if (dateStr.includes('T')) {
        return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
      }
      return dateStr
    } catch { return dateStr }
  }

  const menuItems = [
    { icon: BadgeCheck, label: 'بطاقة العضو', path: '/member-card', highlight: true },
    { icon: FileText, label: 'كشف الحساب', path: '/statement' },
    { icon: Edit, label: 'تعديل الملف', path: '/profile-wizard' },
    { icon: Settings, label: 'الإعدادات', path: '/settings' },
    { icon: HelpCircle, label: 'المساعدة والدعم', path: '/settings' },
  ]

  const handleLogout = () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      logout()
      navigate('/login')
    }
  }

  // CSS classes - defined before render
  const refreshBtnClass = 'absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition ' + (refreshing ? 'animate-spin' : '')
  const statusClass = 'inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 rounded-full text-sm'
  const dotClass = 'w-2 h-2 bg-green-400 rounded-full animate-pulse'
  const itemClass = 'card flex items-center gap-4 animate-fadeIn cursor-pointer hover:shadow-md transition'
  const iconWrapClass = 'w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100'
  const labelClass = 'flex-1 font-medium text-gray-700'

  if (loading && !cache.profile?.data) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="gradient-primary pt-12 pb-16 text-white text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30">
            <User size={48} className="text-white" />
          </div>
          <div className="animate-pulse">
            <div className="h-6 bg-white/20 rounded w-32 mx-auto mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-24 mx-auto"></div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="gradient-primary pt-12 pb-16 text-white text-center relative">
        <button onClick={() => loadProfileData(true)} className={refreshBtnClass} disabled={refreshing}>
          <RefreshCw size={20} className="text-white" />
        </button>
        <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30">
          <User size={48} className="text-white" />
        </div>
        <h2 className="text-xl font-bold">{profileData.name || 'جاري التحميل...'}</h2>
        <p className="text-white/80 text-sm mt-1">رقم العضوية: {profileData.membershipId || '-'}</p>
        <div className="mt-3">
          <span className={statusClass}>
            <span className={dotClass}></span>
            {profileData.status}
          </span>
        </div>
      </div>
      <div className="px-5 -mt-8">
        <div className="card animate-fadeIn">
          <div className="info-row"><span className="info-label">📱 رقم الهاتف</span><span className="info-value" dir="ltr">{profileData.phone || '-'}</span></div>
          <div className="info-row"><span className="info-label">📅 تاريخ الانضمام</span><span className="info-value">{formatDate(profileData.joinDate)}</span></div>
          <div className="info-row"><span className="info-label">🏠 الفخذ</span><span className="info-value">{profileData.branch || '-'}</span></div>
          <div className="info-row"><span className="info-label">💰 الرصيد</span><span className="info-value text-primary-500 font-bold">{typeof profileData.balance === 'number' ? profileData.balance.toLocaleString('ar-SA') : '0'} ر.س</span></div>
        </div>
        <div className="mt-5 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={index} className={itemClass} style={{ animationDelay: (index * 0.05) + 's' }} onClick={() => navigate(item.path)}>
                <div className={iconWrapClass}><Icon size={20} className={item.highlight ? 'text-white' : 'text-gray-600'} />
                </div>
                <span className={labelClass}>{item.label}</span>
                <span className="text-gray-300">←</span>
              </div>
            )
          })}
        </div>
        <button onClick={handleLogout} className="w-full mt-6 py-4 flex items-center justify-center gap-2 text-red-500 bg-red-50 rounded-xl font-semibold touch-feedback border border-red-100 hover:bg-red-100 transition">
          <LogOut size={20} />
          تسجيل الخروج
        </button>
        <p className="text-center text-gray-300 text-xs mt-6">صندوق عائلة شعيل العنزي<br />الإصدار 2.0.0</p>
      </div>
      <BottomNav />
    </div>
  )
}

export default Profile

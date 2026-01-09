/**
 * PaymentCenter - مركز الدفع الشامل
 * 
 * Features:
 * - Toggle: لنفسي / لعضو آخر
 * - Member search for pay-on-behalf
 * - 4 Payment types: Subscription, Diya, Initiative, Bank Transfer
 * - Beautiful glassmorphism design
 * 
 * Created: December 2025
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  CreditCard, 
  Users, 
  User,
  Wallet,
  Scale,
  Heart,
  Building2,
  ChevronLeft,
  Check,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../App'
import { useDataCache } from '../contexts/DataCacheContext'
import MemberSearchField from '../components/MemberSearchField'
import BottomNav from '../components/BottomNav'
import api from '../utils/api'

const PaymentCenter = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cache, fetchProfile, invalidateCache } = useDataCache()

  // Payment target: 'self' or 'other'
  const [paymentTarget, setPaymentTarget] = useState('self')
  const [selectedMember, setSelectedMember] = useState(null)
  
  // Current user balance
  const [myBalance, setMyBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load current user's balance
  useEffect(() => {
    loadMyData()
  }, [])

  const loadMyData = async () => {
    try {
      const result = await fetchProfile()
      if (result?.data) {
        setMyBalance(result.data.current_balance || result.data.balance || 0)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle member selection
  const handleMemberSelect = (member) => {
    setSelectedMember(member)
  }

  // Clear selected member
  const handleClearMember = () => {
    setSelectedMember(null)
  }

  // Toggle payment target
  const handleTargetChange = (target) => {
    setPaymentTarget(target)
    if (target === 'self') {
      setSelectedMember(null)
    }
  }

  // Navigate to specific payment type
  const navigateToPayment = (type) => {
    // If paying for another, must select member first
    if (paymentTarget === 'other' && !selectedMember) {
      return
    }

    const params = new URLSearchParams()
    if (paymentTarget === 'other' && selectedMember) {
      params.append('beneficiary_id', selectedMember.id)
      params.append('beneficiary_name', selectedMember.full_name_ar)
      params.append('is_on_behalf', 'true')
    }

    switch (type) {
      case 'subscription':
        navigate(`/payment/subscription?${params.toString()}`)
        break
      case 'diya':
        navigate(`/payment/diya?${params.toString()}`)
        break
      case 'initiative':
        navigate(`/payment/initiative?${params.toString()}`)
        break
      case 'bank':
        navigate(`/payment/bank-transfer?${params.toString()}`)
        break
      default:
        break
    }
  }

  // Payment type cards config
  const paymentTypes = [
    {
      id: 'subscription',
      icon: Wallet,
      title: 'الاشتراك',
      subtitle: '50 ر.س شهرياً',
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-50 to-purple-50',
      borderColor: 'border-violet-200',
      iconBg: 'bg-violet-500'
    },
    {
      id: 'diya',
      icon: Scale,
      title: 'الدية',
      subtitle: 'المساهمة في قضايا الدية',
      gradient: 'from-red-500 to-rose-600',
      bgGradient: 'from-red-50 to-rose-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-500'
    },
    {
      id: 'initiative',
      icon: Heart,
      title: 'المبادرات',
      subtitle: 'دعم المبادرات العائلية',
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-200',
      iconBg: 'bg-emerald-500'
    },
    {
      id: 'bank',
      icon: Building2,
      title: 'تحويل بنكي',
      subtitle: 'رفع إيصال التحويل',
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-500'
    }
  ]

  // Check if can proceed (for 'other' target, member must be selected)
  const canProceed = paymentTarget === 'self' || (paymentTarget === 'other' && selectedMember)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="back-button ml-3">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">مركز الدفع</h1>
            <p className="text-white/70 text-sm">اختر نوع الدفع والمستفيد</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* My Balance Card */}
        <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-5 text-white mb-5 shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">رصيدي الحالي</p>
              <p className="text-3xl font-bold">{myBalance.toLocaleString('ar-SA')} <span className="text-lg">ر.س</span></p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${myBalance >= 3000 ? 'bg-green-400/30' : 'bg-red-400/30'}`}>
              <span className="text-3xl">{myBalance >= 3000 ? '🟢' : '🔴'}</span>
            </div>
          </div>
        </div>

        {/* Payment Target Toggle */}
        <div className="mb-5 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
            <Users size={18} />
            الدفع لـ
          </h3>
          <div className="bg-white rounded-2xl p-2 flex gap-2 shadow-sm border border-gray-100">
            <button
              onClick={() => handleTargetChange('self')}
              className={`flex-1 py-4 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ${
                paymentTarget === 'self'
                  ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User size={22} />
              <span className="font-semibold">👤 لنفسي</span>
            </button>
            <button
              onClick={() => handleTargetChange('other')}
              className={`flex-1 py-4 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ${
                paymentTarget === 'other'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users size={22} />
              <span className="font-semibold">👥 لعضو آخر</span>
            </button>
          </div>
        </div>

        {/* Member Search (if paying for another) */}
        {paymentTarget === 'other' && (
          <div className="mb-5 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
            <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-pink-500" />
              اختر العضو المستفيد
            </h3>
            <MemberSearchField
              selectedMember={selectedMember}
              onSelect={handleMemberSelect}
              onClear={handleClearMember}
              placeholder="ابحث برقم العضوية أو الاسم..."
            />
          </div>
        )}

        {/* Payment Type Cards */}
        <div className="mb-5 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
            <CreditCard size={18} />
            اختر نوع الدفع
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {paymentTypes.map((type, index) => {
              const IconComponent = type.icon
              const isDisabled = !canProceed
              
              return (
                <button
                  key={type.id}
                  onClick={() => navigateToPayment(type.id)}
                  disabled={isDisabled}
                  className={`
                    relative overflow-hidden rounded-2xl p-4 text-right transition-all duration-300 border-2
                    ${isDisabled 
                      ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200' 
                      : `bg-gradient-to-br ${type.bgGradient} ${type.borderColor} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`
                    }
                  `}
                  style={{ animationDelay: `${(index + 3) * 0.05}s` }}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 ${type.iconBg} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
                    <IconComponent size={24} className="text-white" />
                  </div>
                  
                  {/* Title */}
                  <h4 className="font-bold text-gray-800 text-base mb-1">{type.title}</h4>
                  <p className="text-gray-500 text-xs">{type.subtitle}</p>
                  
                  {/* Arrow */}
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <ChevronLeft size={20} className="text-gray-300" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Warning if member not selected */}
        {paymentTarget === 'other' && !selectedMember && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
            <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />
            <p className="text-amber-700 text-sm">
              يجب اختيار العضو المستفيد قبل المتابعة
            </p>
          </div>
        )}

        {/* Quick Actions - Payment History */}
        <div className="mt-6 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => navigate('/payments/history')}
            className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-gray-500" />
              </div>
              <span className="font-semibold text-gray-700">سجل المدفوعات</span>
            </div>
            <ChevronLeft size={20} className="text-gray-300" />
          </button>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-fadeIn" style={{ animationDelay: '0.35s' }}>
          <p className="text-blue-600 text-sm text-center">
            💡 يمكنك الدفع لنفسك أو نيابة عن أي عضو آخر في العائلة
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default PaymentCenter

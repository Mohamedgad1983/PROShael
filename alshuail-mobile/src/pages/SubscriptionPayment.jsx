/**
 * SubscriptionPayment - صفحة دفع الاشتراك
 * 
 * Features:
 * - Month selection (Hijri)
 * - Fixed 50 SAR amount
 * - Pay for self or another member
 * - Success animation
 * 
 * Created: December 2025
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ArrowRight, 
  Wallet,
  Calendar,
  Check,
  AlertCircle,
  CreditCard,
  User,
  Users
} from 'lucide-react'
import { useAuth } from '../App'
import { useDataCache } from '../contexts/DataCacheContext'
import BottomNav from '../components/BottomNav'
import paymentService from '../services/paymentService'

// Hijri months
const HIJRI_MONTHS = [
  { id: 1, name: 'محرم' },
  { id: 2, name: 'صفر' },
  { id: 3, name: 'ربيع الأول' },
  { id: 4, name: 'ربيع الثاني' },
  { id: 5, name: 'جمادى الأولى' },
  { id: 6, name: 'جمادى الآخرة' },
  { id: 7, name: 'رجب' },
  { id: 8, name: 'شعبان' },
  { id: 9, name: 'رمضان' },
  { id: 10, name: 'شوال' },
  { id: 11, name: 'ذو القعدة' },
  { id: 12, name: 'ذو الحجة' }
]

const SUBSCRIPTION_AMOUNT = 50

const SubscriptionPayment = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { invalidateCache } = useDataCache()

  // Get beneficiary from URL params
  const isOnBehalf = searchParams.get('is_on_behalf') === 'true'
  const beneficiaryId = searchParams.get('beneficiary_id')
  const beneficiaryName = searchParams.get('beneficiary_name')

  // State
  const [selectedYear, setSelectedYear] = useState(1446)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Years available for payment
  const years = [1445, 1446, 1447]

  // Handle month selection
  const handleMonthSelect = (month) => {
    setSelectedMonth(month)
    setError(null)
  }

  // Handle payment submission
  const handlePayment = async () => {
    if (!selectedMonth) {
      setError('يرجى اختيار الشهر')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const paymentData = {
        payment_type: 'subscription',
        amount: SUBSCRIPTION_AMOUNT,
        year: selectedYear,
        month: selectedMonth.id,
        beneficiary_id: isOnBehalf ? beneficiaryId : user?.id,
        is_on_behalf: isOnBehalf,
        notes: `اشتراك ${selectedMonth.name} ${selectedYear}هـ`
      }

      const response = await paymentService.paySubscription(paymentData)
      
      if (response?.success) {
        setSuccess(true)
        // Invalidate caches to refresh data
        invalidateCache('subscriptions')
        invalidateCache('payments')
        invalidateCache('profile')
        invalidateCache('dashboard')
      } else {
        setError(response?.message || 'حدث خطأ في عملية الدفع')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError(err.response?.data?.message || 'حدث خطأ في عملية الدفع')
    } finally {
      setLoading(false)
    }
  }

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500 to-emerald-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl animate-scaleIn">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تم الدفع بنجاح! 🎉</h2>
          <p className="text-gray-500 mb-6">
            تم دفع اشتراك {selectedMonth?.name} {selectedYear}هـ
          </p>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-right">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">المبلغ</span>
              <span className="font-bold text-gray-800">{SUBSCRIPTION_AMOUNT} ر.س</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">الشهر</span>
              <span className="font-bold text-gray-800">{selectedMonth?.name} {selectedYear}هـ</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">المستفيد</span>
              <span className="font-bold text-gray-800">
                {isOnBehalf ? beneficiaryName : 'أنت'}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/payment-center')}
            className="btn-primary"
          >
            العودة لمركز الدفع
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 pt-14 pb-8">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="back-button ml-3">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">دفع الاشتراك</h1>
            <p className="text-white/70 text-sm">اختر الشهر المراد دفعه</p>
          </div>
        </div>

        {/* Amount Card */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">المبلغ الثابت</p>
              <p className="text-3xl font-bold text-white">{SUBSCRIPTION_AMOUNT} <span className="text-lg">ر.س</span></p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4">
        {/* Beneficiary Info */}
        <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${
          isOnBehalf 
            ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200' 
            : 'bg-gradient-to-r from-primary-50 to-purple-50 border-2 border-primary-200'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isOnBehalf ? 'bg-pink-500' : 'bg-primary-500'
          }`}>
            {isOnBehalf ? <Users size={24} className="text-white" /> : <User size={24} className="text-white" />}
          </div>
          <div>
            <p className={`text-sm ${isOnBehalf ? 'text-pink-600' : 'text-primary-600'}`}>
              {isOnBehalf ? '👥 الدفع نيابة عن' : '👤 الدفع لنفسي'}
            </p>
            <p className="font-bold text-gray-800">
              {isOnBehalf ? beneficiaryName : (user?.full_name_ar || user?.name || 'أنت')}
            </p>
          </div>
        </div>

        {/* Year Selection */}
        <div className="mb-5">
          <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
            <Calendar size={18} />
            السنة
          </h3>
          <div className="flex gap-2">
            {years.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  selectedYear === year
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-violet-300'
                }`}
              >
                {year}هـ
              </button>
            ))}
          </div>
        </div>

        {/* Month Selection */}
        <div className="mb-5">
          <h3 className="text-gray-700 font-semibold mb-3">اختر الشهر</h3>
          <div className="grid grid-cols-3 gap-2">
            {HIJRI_MONTHS.map(month => (
              <button
                key={month.id}
                onClick={() => handleMonthSelect(month)}
                className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedMonth?.id === month.id
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-violet-300'
                }`}
              >
                {month.name}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Summary */}
        {selectedMonth && (
          <div className="bg-white rounded-xl p-4 mb-5 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-700 mb-3">ملخص الدفع</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">الشهر</span>
                <span className="font-semibold">{selectedMonth.name} {selectedYear}هـ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">المستفيد</span>
                <span className="font-semibold">{isOnBehalf ? beneficiaryName : 'أنت'}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-700 font-semibold">الإجمالي</span>
                <span className="text-xl font-bold text-violet-600">{SUBSCRIPTION_AMOUNT} ر.س</span>
              </div>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={!selectedMonth || loading}
          className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3 transition-all ${
            selectedMonth && !loading
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              جاري الدفع...
            </>
          ) : (
            <>
              <CreditCard size={20} />
              تأكيد الدفع - {SUBSCRIPTION_AMOUNT} ر.س
            </>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

export default SubscriptionPayment

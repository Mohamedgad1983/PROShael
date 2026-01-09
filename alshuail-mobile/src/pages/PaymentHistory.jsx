/**
 * PaymentHistory - سجل المدفوعات
 * 
 * Features:
 * - All payments history
 * - Filter by type
 * - Show on-behalf payments
 * - Tab for payments made for me by others
 * 
 * Created: December 2025
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  Clock,
  Check,
  AlertCircle,
  Wallet,
  Scale,
  Heart,
  Building2,
  User,
  Users,
  Filter,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../App'
import BottomNav from '../components/BottomNav'
import paymentService from '../services/paymentService'

const PaymentHistory = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // State
  const [activeTab, setActiveTab] = useState('all') // 'all', 'forOthers', 'fromOthers'
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Load payments
  useEffect(() => {
    loadPayments()
  }, [activeTab])

  const loadPayments = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    setError(null)

    try {
      let response
      switch (activeTab) {
        case 'forOthers':
          response = await paymentService.getPaymentsForOthers()
          break
        case 'fromOthers':
          response = await paymentService.getPaymentsFromOthers()
          break
        default:
          response = await paymentService.getPaymentHistory()
      }

      if (response?.success && response?.data) {
        setPayments(response.data)
      } else {
        // Mock data for demo
        setPayments([
          {
            id: '1',
            type: 'subscription',
            amount: 50,
            date: '2024-12-10',
            hijri_date: '1446/06/15',
            status: 'completed',
            is_on_behalf: false,
            payer_name: user?.full_name_ar,
            beneficiary_name: user?.full_name_ar,
            details: 'جمادى الثانية 1446'
          },
          {
            id: '2',
            type: 'diya',
            amount: 500,
            date: '2024-12-08',
            hijri_date: '1446/06/13',
            status: 'completed',
            is_on_behalf: true,
            payer_name: 'عبدالله سعود الشعيل',
            beneficiary_name: user?.full_name_ar,
            details: 'قضية عبدالله محمد'
          },
          {
            id: '3',
            type: 'bank_transfer',
            amount: 300,
            date: '2024-12-05',
            hijri_date: '1446/06/10',
            status: 'pending',
            is_on_behalf: false,
            payer_name: user?.full_name_ar,
            beneficiary_name: user?.full_name_ar,
            details: 'تحويل بنكي - قيد المراجعة'
          },
          {
            id: '4',
            type: 'initiative',
            amount: 100,
            date: '2024-12-01',
            hijri_date: '1446/06/06',
            status: 'completed',
            is_on_behalf: false,
            payer_name: user?.full_name_ar,
            beneficiary_name: user?.full_name_ar,
            details: 'مبادرة زواج الشباب'
          }
        ])
      }
    } catch (err) {
      console.error('Error loading payments:', err)
      setError('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Get type icon and color
  const getTypeInfo = (type) => {
    switch (type) {
      case 'subscription':
        return { 
          icon: Wallet, 
          label: 'اشتراك', 
          bgColor: 'bg-violet-100', 
          textColor: 'text-violet-600',
          gradient: 'from-violet-500 to-purple-600'
        }
      case 'diya':
        return { 
          icon: Scale, 
          label: 'دية', 
          bgColor: 'bg-red-100', 
          textColor: 'text-red-600',
          gradient: 'from-red-500 to-rose-600'
        }
      case 'initiative':
        return { 
          icon: Heart, 
          label: 'مبادرة', 
          bgColor: 'bg-emerald-100', 
          textColor: 'text-emerald-600',
          gradient: 'from-emerald-500 to-green-600'
        }
      case 'bank_transfer':
        return { 
          icon: Building2, 
          label: 'تحويل بنكي', 
          bgColor: 'bg-amber-100', 
          textColor: 'text-amber-600',
          gradient: 'from-amber-500 to-orange-600'
        }
      default:
        return { 
          icon: Wallet, 
          label: 'دفع', 
          bgColor: 'bg-gray-100', 
          textColor: 'text-gray-600',
          gradient: 'from-gray-500 to-gray-600'
        }
    }
  }

  // Get status info
  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { icon: Check, label: 'مكتمل', color: 'text-green-600', bgColor: 'bg-green-100' }
      case 'pending':
        return { icon: Clock, label: 'قيد المراجعة', color: 'text-amber-600', bgColor: 'bg-amber-100' }
      case 'rejected':
        return { icon: AlertCircle, label: 'مرفوض', color: 'text-red-600', bgColor: 'bg-red-100' }
      default:
        return { icon: Clock, label: 'غير معروف', color: 'text-gray-600', bgColor: 'bg-gray-100' }
    }
  }

  // Tabs
  const tabs = [
    { id: 'all', label: 'الكل', icon: Filter },
    { id: 'forOthers', label: 'دفعاتي للغير', icon: Users },
    { id: 'fromOthers', label: 'دفعات من الغير', icon: User }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل السجل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="back-button ml-3">
              <ArrowRight size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">سجل المدفوعات</h1>
              <p className="text-white/70 text-sm">جميع العمليات المالية</p>
            </div>
          </div>
          <button
            onClick={() => loadPayments(true)}
            className={`p-2 bg-white/20 rounded-full ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 flex gap-1 mb-5 shadow-sm">
          {tabs.map(tab => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TabIcon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Payments List */}
        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((payment, index) => {
              const typeInfo = getTypeInfo(payment.type)
              const statusInfo = getStatusInfo(payment.status)
              const TypeIcon = typeInfo.icon
              const StatusIcon = statusInfo.icon

              return (
                <div 
                  key={payment.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-fadeIn"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${typeInfo.gradient}`}>
                      <TypeIcon size={22} className="text-white" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.bgColor} ${typeInfo.textColor} font-semibold`}>
                          {typeInfo.label}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.color} font-semibold flex items-center gap-1`}>
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </div>

                      <p className="text-gray-800 font-semibold text-sm truncate">
                        {payment.details}
                      </p>

                      {/* On behalf info */}
                      {payment.is_on_behalf && (
                        <div className="flex items-center gap-1 mt-1">
                          <Users size={12} className="text-pink-500" />
                          <span className="text-xs text-pink-600">
                            {activeTab === 'fromOthers' 
                              ? `من: ${payment.payer_name}` 
                              : `لـ: ${payment.beneficiary_name}`
                            }
                          </span>
                        </div>
                      )}

                      <p className="text-gray-400 text-xs mt-1">
                        {payment.hijri_date}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-left">
                      <p className={`text-lg font-bold ${payment.status === 'completed' ? 'text-green-600' : payment.status === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>
                        {payment.amount.toLocaleString('ar-SA')}
                      </p>
                      <p className="text-gray-400 text-xs">ر.س</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-semibold">لا توجد مدفوعات</p>
            <p className="text-gray-400 text-sm mt-1">سيظهر سجل مدفوعاتك هنا</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default PaymentHistory

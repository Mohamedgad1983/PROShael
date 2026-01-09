import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CreditCard, Check, Clock, AlertCircle, ChevronLeft, Calendar, RefreshCw } from 'lucide-react'
import { useAuth } from '../App'
import api from '../utils/api'
import BottomNav from '../components/BottomNav'

const Payments = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Years summary - payment history by year
  const [years, setYears] = useState([])
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalDue, setTotalDue] = useState(0)

  useEffect(() => {
    loadPaymentData()
  }, [])

  // Load payment data from statement API (uses correct members.current_balance)
  const loadPaymentData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    setError(null)

    try {
      // Get membership number from user
      const membershipNumber = user?.membershipNumber || user?.membership_number || user?.membership_id

      if (!membershipNumber) {
        setError('لم يتم العثور على رقم العضوية')
        return
      }

      // Use the statement API which has correct balance from members table
      const response = await api.get(`/statements/generate/${membershipNumber}`)

      if (response.data?.success && response.data?.data) {
        const statement = response.data.data

        // Set total paid from correct source (members.current_balance)
        setTotalPaid(statement.currentBalance || 0)

        // Calculate due (target - current)
        setTotalDue(statement.shortfall || 0)

        // Convert transactions to year format for display
        const transactions = statement.recentTransactions || []
        const yearsData = transactions.map(tx => ({
          year: tx.year?.toString() || '',
          paid: 12, // Full year paid (600 SAR = 12 months × 50)
          total: 12,
          amount: tx.amount || 600,
          status: 'completed',
          date: tx.date
        }))

        setYears(yearsData)
      } else {
        setError(response.data?.error || 'فشل في تحميل البيانات')
      }
    } catch (err) {
      console.error('Error fetching payment data:', err)
      setError(err.response?.data?.error || 'حدث خطأ في تحميل الاشتراكات')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getYearStatus = (year) => {
    if (year.paid === year.total) {
      return { text: 'مكتمل', color: 'bg-green-100 text-green-600', icon: Check }
    } else if (year.paid > 0) {
      return { text: `${year.total - year.paid} متبقي`, color: 'bg-orange-100 text-orange-600', icon: Clock }
    } else {
      return { text: 'لم يبدأ', color: 'bg-gray-100 text-gray-500', icon: AlertCircle }
    }
  }

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل الاشتراكات...</p>
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
            <h1 className="text-xl font-bold">الاشتراكات</h1>
          </div>
          <button
            onClick={() => loadPaymentData(true)}
            className={`p-2 bg-white/20 rounded-full ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl p-5 text-white mb-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-xs opacity-80 mb-1">المدفوع</div>
              <div className="text-2xl font-bold">{totalPaid.toLocaleString('ar-SA')} ر.س</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center flex-1">
              <div className="text-xs opacity-80 mb-1">المستحق</div>
              <div className="text-2xl font-bold">{totalDue.toLocaleString('ar-SA')} ر.س</div>
            </div>
          </div>
        </div>

        {/* Pay Now Button */}
        {totalDue > 0 && (
          <button className="btn-primary mb-5 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <CreditCard size={20} />
            دفع المستحقات ({totalDue} ر.س)
          </button>
        )}

        {/* Years List */}
        <h3 className="text-gray-800 font-semibold mb-3">سجل السنوات</h3>
        
        <div className="space-y-3">
          {years.length > 0 ? (
            years.map((year, index) => {
              const status = getYearStatus(year)
              const StatusIcon = status.icon
              const progress = (year.paid / year.total) * 100
              
              return (
                <div 
                  key={year.year}
                  className="card-sm touch-feedback cursor-pointer animate-fadeIn"
                  style={{ animationDelay: `${(index + 2) * 0.05}s` }}
                  onClick={() => navigate(`/subscriptions/${year.year}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Calendar size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">سنة {year.year}هـ</div>
                        <div className="text-gray-400 text-xs">{year.paid} من {year.total} شهر مدفوع</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.text}
                      </span>
                      <ChevronLeft size={18} className="text-gray-300" />
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-primary-500 to-purple-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-10 text-gray-400">
              <CreditCard size={48} className="mx-auto mb-3 opacity-50" />
              <p>لا توجد بيانات اشتراكات</p>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-blue-600 text-sm text-center">
            💡 الاشتراك الشهري: <span className="font-bold">50 ر.س</span>
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default Payments

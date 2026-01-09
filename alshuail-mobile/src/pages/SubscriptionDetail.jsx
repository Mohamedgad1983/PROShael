import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CreditCard, Check, Clock, AlertCircle, ChevronLeft } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import api from '../utils/api'

const SubscriptionDetail = () => {
  const navigate = useNavigate()
  const { year } = useParams()
  const [months, setMonths] = useState([])
  const [summary, setSummary] = useState({ paid: 0, due: 0, total: 12 })
  const [loading, setLoading] = useState(true)

  const hijriMonths = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ]

  useEffect(() => {
    fetchYearData()
  }, [year])

  const fetchYearData = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/subscriptions/year/${year}`)
      setMonths(response.data.months || [])
      setSummary(response.data.summary || {})
    } catch (err) {
      console.log('Using demo subscription data')
      // Demo data
      const demoMonths = hijriMonths.map((name, index) => ({
        id: index + 1,
        month: index + 1,
        name,
        amount: 50,
        status: index < 5 ? 'paid' : index < 7 ? 'due' : 'upcoming',
        paid_date: index < 5 ? `${year}/0${index + 1}/15` : null
      }))
      setMonths(demoMonths)
      setSummary({ paid: 5, due: 2, upcoming: 5, total: 12 })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <Check size={16} className="text-green-500" />
      case 'due':
        return <AlertCircle size={16} className="text-orange-500" />
      default:
        return <Clock size={16} className="text-gray-400" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return { text: 'مدفوع', color: 'bg-green-100 text-green-600' }
      case 'due':
        return { text: 'مستحق', color: 'bg-orange-100 text-orange-600' }
      default:
        return { text: 'قادم', color: 'bg-gray-100 text-gray-500' }
    }
  }

  const handlePayMonth = (month) => {
    // TODO: Navigate to payment screen
    alert(`قريباً: دفع اشتراك شهر ${month.name}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header-with-back">
        <div className="back-btn" onClick={() => navigate(-1)}>
          <ArrowRight size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">سنة {year}هـ</h2>
          <p className="text-white/80 text-sm">تفاصيل الاشتراكات الشهرية</p>
        </div>
      </div>

      <div className="page-content">
        {/* Summary Card */}
        <div className="bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl p-5 text-white mb-5 animate-fadeIn">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{summary.paid || 0}</div>
              <div className="text-xs opacity-80">مدفوع</div>
            </div>
            <div className="border-x border-white/20">
              <div className="text-2xl font-bold">{summary.due || 0}</div>
              <div className="text-xs opacity-80">مستحق</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.upcoming || 5}</div>
              <div className="text-xs opacity-80">قادم</div>
            </div>
          </div>
          
          {/* Progress */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between text-xs mb-2">
              <span>التقدم</span>
              <span>{Math.round((summary.paid / 12) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${(summary.paid / 12) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Months List */}
        <h3 className="text-gray-800 font-semibold mb-3">الأشهر</h3>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {months.map((month, index) => {
              const statusBadge = getStatusBadge(month.status)
              return (
                <div 
                  key={month.id}
                  className="card-sm flex items-center justify-between animate-fadeIn"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      month.status === 'paid' ? 'bg-green-100' :
                      month.status === 'due' ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      {getStatusIcon(month.status)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{month.name}</div>
                      <div className="text-gray-400 text-xs">
                        {month.paid_date ? `تم الدفع: ${month.paid_date}` : `${month.amount} ر.س`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full ${statusBadge.color}`}>
                      {statusBadge.text}
                    </span>
                    
                    {month.status === 'due' && (
                      <button
                        onClick={() => handlePayMonth(month)}
                        className="p-2 bg-primary-500 text-white rounded-lg"
                      >
                        <CreditCard size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pay All Due Button */}
        {summary.due > 0 && (
          <button className="btn-primary mt-6">
            <CreditCard size={20} />
            دفع جميع المستحقات ({summary.due * 50} ر.س)
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default SubscriptionDetail

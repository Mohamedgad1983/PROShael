import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RefreshCw, TrendingUp, TrendingDown, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../App'
import api from '../utils/api'
import BottomNav from '../components/BottomNav'

const Statement = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [statement, setStatement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStatement()
  }, [])

  const fetchStatement = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    setError(null)

    try {
      // Use membership number (like 10033), not UUID
      const membershipNumber = user?.membershipNumber || user?.membership_number || user?.membership_id
      if (!membershipNumber) {
        setError('لم يتم العثور على رقم العضوية')
        return
      }

      const response = await api.get(`/statements/generate/${membershipNumber}`)
      if (response.data?.success) {
        setStatement(response.data.data)
      } else {
        setError(response.data?.error || 'فشل في تحميل كشف الحساب')
      }
    } catch (err) {
      console.error('Statement fetch error:', err)
      setError(err.response?.data?.error || 'حدث خطأ في تحميل كشف الحساب')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch { return dateStr }
  }

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('ar-SA') + ' ر.س'
  }

  const getAlertColor = (level) => {
    switch(level) {
      case 'ZERO_BALANCE': return 'bg-red-500'
      case 'CRITICAL': return 'bg-red-400'
      case 'WARNING': return 'bg-yellow-500'
      case 'SUFFICIENT': return 'bg-green-500'
      default: return 'bg-gray-400'
    }
  }

  const getAlertBgColor = (level) => {
    switch(level) {
      case 'ZERO_BALANCE': return 'bg-red-50 border-red-200'
      case 'CRITICAL': return 'bg-red-50 border-red-200'
      case 'WARNING': return 'bg-yellow-50 border-yellow-200'
      case 'SUFFICIENT': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="gradient-primary p-5 pt-12 text-white">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
              <ArrowRight size={24} />
            </button>
            <h1 className="text-xl font-bold">كشف الحساب</h1>
          </div>
        </div>
        <div className="p-5">
          <div className="card animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="gradient-primary p-5 pt-12 text-white">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
              <ArrowRight size={24} />
            </button>
            <h1 className="text-xl font-bold">كشف الحساب</h1>
          </div>
        </div>
        <div className="p-5">
          <div className="card text-center py-10">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchStatement(true)}
              className="btn-primary px-6 py-2"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="gradient-primary p-5 pt-12 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
              <ArrowRight size={24} />
            </button>
            <h1 className="text-xl font-bold">كشف الحساب</h1>
          </div>
          <button
            onClick={() => fetchStatement(true)}
            className={`p-2 rounded-full hover:bg-white/20 ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Member Info */}
        <div className="text-center pb-4">
          <h2 className="text-lg font-semibold">{statement?.fullName || '-'}</h2>
          <p className="text-white/80 text-sm">رقم العضوية: {statement?.memberId || '-'}</p>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {/* Balance Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm">الرصيد الحالي</span>
            <div className={`w-3 h-3 rounded-full ${getAlertColor(statement?.alertLevel)}`}></div>
          </div>
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {formatCurrency(statement?.currentBalance)}
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>نسبة الإكتمال</span>
              <span>{statement?.percentageComplete || 0}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getAlertColor(statement?.alertLevel)} transition-all duration-500`}
                style={{ width: `${Math.min(statement?.percentageComplete || 0, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs">الهدف</span>
              <span className="font-semibold">{formatCurrency(statement?.targetBalance)}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs">المتبقي</span>
              <span className="font-semibold text-red-500">{formatCurrency(statement?.shortfall)}</span>
            </div>
          </div>
        </div>

        {/* Alert Message */}
        {statement?.alertMessage && (
          <div className={`p-4 rounded-xl border ${getAlertBgColor(statement?.alertLevel)}`}>
            <div className="flex items-start gap-3">
              {statement?.alertLevel === 'SUFFICIENT' ? (
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
              )}
              <p className="text-sm text-gray-700">{statement?.alertMessage}</p>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">إحصائيات</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <TrendingUp size={18} className="text-green-500" />
                <span className="text-sm">إجمالي المدفوعات</span>
              </div>
              <span className="font-semibold">{formatCurrency(statement?.statistics?.totalPayments)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={18} className="text-blue-500" />
                <span className="text-sm">آخر دفعة</span>
              </div>
              <span className="font-semibold">{formatDate(statement?.statistics?.lastPaymentDate)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={18} className="text-purple-500" />
                <span className="text-sm">عضو منذ</span>
              </div>
              <span className="font-semibold">{formatDate(statement?.memberSince)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">سجل المدفوعات</h3>
          {statement?.recentTransactions && statement.recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {statement.recentTransactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'payment' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {tx.type === 'payment' ? (
                        <TrendingUp size={18} className="text-green-600" />
                      ) : (
                        <TrendingDown size={18} className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {tx.description || (tx.type === 'payment' ? `اشتراك سنة ${tx.year}` : 'معاملة')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.year ? `سنة ${tx.year}` : formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`font-semibold ${
                      tx.type === 'payment' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'payment' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    {tx.status === 'completed' && (
                      <p className="text-xs text-green-500">مكتمل ✓</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد مدفوعات مسجلة</p>
            </div>
          )}
        </div>

        {/* Summary Info */}
        {statement?.statistics?.monthsPaidAhead > 0 && (
          <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-green-800 font-semibold">اشتراك مدفوع مقدماً</p>
                <p className="text-green-600 text-sm">
                  {statement.statistics.monthsPaidAhead} شهر ({Math.floor(statement.statistics.monthsPaidAhead / 12)} سنة)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default Statement

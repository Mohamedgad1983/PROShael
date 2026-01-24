/**
 * Fund Balance Widget Component (Mobile PWA)
 * Compact display of fund balance for authorized users
 * Feature: 001-fund-balance-system (User Story 1 - Mobile)
 *
 * Constitution Compliance:
 * - Principle I: Arabic-First (Arabic labels as primary)
 * - Principle V: Financial Accuracy (displays accurate balance)
 * - Principle VI: Fund Balance Integrity (shows real-time balance)
 */

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertTriangle, Wallet } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.alshailfund.com/api'

const FundBalanceWidget = () => {
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBalance = useCallback(async () => {
    try {
      setRefreshing(true)
      const token = localStorage.getItem('alshuail_token')

      if (!token) {
        setError('غير مصرح')
        return
      }

      const response = await fetch(`${API_URL}/fund/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // 403 = Not authorized, just hide the widget
        if (response.status === 403) {
          setBalance(null)
          setError(null)
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setBalance(data.data)
        setError(null)
      } else {
        throw new Error(data.error || 'فشل في جلب الرصيد')
      }
    } catch (err) {
      console.error('Error fetching fund balance:', err)
      setError(err.message || 'خطأ في الاتصال')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchBalance, 60000)
    return () => clearInterval(interval)
  }, [fetchBalance])

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Don't show loading skeleton - only show when data is available
  // This prevents showing a skeleton for unauthorized users
  if (loading) {
    return null
  }

  if (error) {
    return (
      <div className="card mb-4 bg-red-50 border border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={fetchBalance}
            className="p-2 text-red-600 hover:bg-red-100 rounded-full"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    )
  }

  if (!balance) return null

  const isLowBalance = balance.is_low_balance

  return (
    <div className={`card mb-4 ${isLowBalance ? 'bg-amber-50 border border-amber-300' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${isLowBalance ? 'bg-amber-200' : 'bg-emerald-200'}`}>
            <Wallet size={18} className={isLowBalance ? 'text-amber-700' : 'text-emerald-700'} />
          </div>
          <div>
            <div className="text-gray-600 text-xs">رصيد الصندوق</div>
            <div className="text-gray-400 text-[10px]">Fund Balance</div>
          </div>
        </div>
        <button
          onClick={fetchBalance}
          disabled={refreshing}
          className={`p-2 rounded-full transition-colors ${isLowBalance ? 'hover:bg-amber-200' : 'hover:bg-emerald-200'}`}
        >
          <RefreshCw
            size={16}
            className={`${refreshing ? 'animate-spin' : ''} ${isLowBalance ? 'text-amber-600' : 'text-emerald-600'}`}
          />
        </button>
      </div>

      <div className={`text-2xl font-bold ${isLowBalance ? 'text-amber-700' : 'text-emerald-700'}`}>
        <span className="text-sm ml-1">ر.س</span>
        {formatCurrency(balance.current_balance)}
      </div>

      {isLowBalance && (
        <div className="flex items-center gap-1 mt-2 text-amber-600 text-xs">
          <AlertTriangle size={14} />
          <span>تحذير: الرصيد منخفض</span>
        </div>
      )}

      {/* Mini Breakdown */}
      <div className="flex justify-between mt-3 pt-3 border-t border-gray-200/50 text-xs">
        <div className="text-center">
          <div className="text-gray-400">الإيرادات</div>
          <div className="text-green-600 font-semibold">{formatCurrency(balance.total_revenue)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">المصروفات</div>
          <div className="text-red-600 font-semibold">{formatCurrency(balance.total_expenses)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">الدية</div>
          <div className="text-purple-600 font-semibold">{formatCurrency(balance.total_internal_diya)}</div>
        </div>
      </div>
    </div>
  )
}

export default FundBalanceWidget

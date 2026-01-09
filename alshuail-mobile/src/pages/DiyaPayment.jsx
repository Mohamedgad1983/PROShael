/**
 * DiyaPayment - صفحة المساهمة في الدية
 * 
 * Features:
 * - Select active Diya case
 * - Show progress (target/collected/remaining)
 * - Variable amount input
 * - Pay for self or another member
 * 
 * Created: December 2025
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ArrowRight, 
  Scale,
  Check,
  AlertCircle,
  CreditCard,
  User,
  Users,
  Target,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '../App'
import { useDataCache } from '../contexts/DataCacheContext'
import BottomNav from '../components/BottomNav'
import paymentService from '../services/paymentService'

const DiyaPayment = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { invalidateCache } = useDataCache()

  // Get beneficiary from URL params
  const isOnBehalf = searchParams.get('is_on_behalf') === 'true'
  const beneficiaryId = searchParams.get('beneficiary_id')
  const beneficiaryName = searchParams.get('beneficiary_name')

  // State
  const [cases, setCases] = useState([])
  const [selectedCase, setSelectedCase] = useState(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Load active Diya cases
  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    try {
      const response = await paymentService.getActiveDiyaCases()
      if (response?.success && response?.data) {
        setCases(response.data)
      } else {
        // Mock data for demo
        setCases([
          {
            id: '1',
            title: 'قضية عبدالله محمد الشعيل',
            description: 'دية بسبب حادث مروري',
            target_amount: 100000,
            collected_amount: 65000,
            status: 'active',
            created_at: '2024-01-15'
          },
          {
            id: '2',
            title: 'قضية سعود ناصر الشعيل',
            description: 'دية شرعية',
            target_amount: 80000,
            collected_amount: 45000,
            status: 'active',
            created_at: '2024-02-20'
          }
        ])
      }
    } catch (err) {
      console.error('Error loading cases:', err)
      // Use mock data on error
      setCases([
        {
          id: '1',
          title: 'قضية عبدالله محمد الشعيل',
          description: 'دية بسبب حادث مروري',
          target_amount: 100000,
          collected_amount: 65000,
          status: 'active'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Handle case selection
  const handleCaseSelect = (diyaCase) => {
    setSelectedCase(diyaCase)
    setError(null)
  }

  // Handle amount change
  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setAmount(value)
  }

  // Quick amount buttons
  const quickAmounts = [100, 200, 500, 1000]

  // Handle payment submission
  const handlePayment = async () => {
    if (!selectedCase) {
      setError('يرجى اختيار القضية')
      return
    }
    if (!amount || parseInt(amount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const paymentData = {
        payment_type: 'diya',
        case_id: selectedCase.id,
        amount: parseInt(amount),
        beneficiary_id: isOnBehalf ? beneficiaryId : user?.id,
        is_on_behalf: isOnBehalf,
        notes: `مساهمة في ${selectedCase.title}`
      }

      const response = await paymentService.payDiya(paymentData)
      
      if (response?.success) {
        setSuccess(true)
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
      setSubmitting(false)
    }
  }

  // Calculate progress percentage
  const getProgress = (collected, target) => {
    return Math.min((collected / target) * 100, 100)
  }

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500 to-rose-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl animate-scaleIn">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تمت المساهمة بنجاح! 🎉</h2>
          <p className="text-gray-500 mb-6">
            جزاك الله خيراً على مساهمتك
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-right">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">المبلغ</span>
              <span className="font-bold text-gray-800">{parseInt(amount).toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">القضية</span>
              <span className="font-bold text-gray-800 text-sm">{selectedCase?.title}</span>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل القضايا...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-rose-600 px-5 pt-14 pb-8">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="back-button ml-3">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">المساهمة في الدية</h1>
            <p className="text-white/70 text-sm">اختر القضية والمبلغ</p>
          </div>
        </div>

        {/* Icon */}
        <div className="flex justify-center mt-2">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Scale size={32} className="text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4">
        {/* Beneficiary Info */}
        <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${
          isOnBehalf 
            ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200' 
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isOnBehalf ? 'bg-pink-500' : 'bg-red-500'
          }`}>
            {isOnBehalf ? <Users size={24} className="text-white" /> : <User size={24} className="text-white" />}
          </div>
          <div>
            <p className={`text-sm ${isOnBehalf ? 'text-pink-600' : 'text-red-600'}`}>
              {isOnBehalf ? '👥 المساهمة نيابة عن' : '👤 المساهمة لنفسي'}
            </p>
            <p className="font-bold text-gray-800">
              {isOnBehalf ? beneficiaryName : (user?.full_name_ar || user?.name || 'أنت')}
            </p>
          </div>
        </div>

        {/* Cases List */}
        <div className="mb-5">
          <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
            <Scale size={18} />
            اختر القضية
          </h3>
          
          {cases.length > 0 ? (
            <div className="space-y-3">
              {cases.map(diyaCase => {
                const progress = getProgress(diyaCase.collected_amount, diyaCase.target_amount)
                const remaining = diyaCase.target_amount - diyaCase.collected_amount
                const isSelected = selectedCase?.id === diyaCase.id
                
                return (
                  <button
                    key={diyaCase.id}
                    onClick={() => handleCaseSelect(diyaCase)}
                    className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-400 shadow-lg'
                        : 'bg-white border-gray-200 hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{diyaCase.title}</h4>
                        <p className="text-gray-500 text-sm">{diyaCase.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="mb-2">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} className="text-green-500" />
                        <span className="text-green-600">{diyaCase.collected_amount.toLocaleString('ar-SA')} ر.س</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target size={14} className="text-gray-400" />
                        <span className="text-gray-500">{diyaCase.target_amount.toLocaleString('ar-SA')} ر.س</span>
                      </div>
                    </div>
                    <p className="text-red-500 text-sm mt-1">
                      المتبقي: {remaining.toLocaleString('ar-SA')} ر.س
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-6 text-center">
              <Scale size={40} className="mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">لا توجد قضايا نشطة حالياً</p>
            </div>
          )}
        </div>

        {/* Amount Input */}
        {selectedCase && (
          <div className="mb-5 animate-fadeIn">
            <h3 className="text-gray-700 font-semibold mb-3">مبلغ المساهمة</h3>
            
            {/* Quick Amounts */}
            <div className="flex gap-2 mb-3">
              {quickAmounts.map(quickAmount => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    amount === quickAmount.toString()
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {quickAmount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="أو أدخل مبلغ آخر"
                className="w-full py-4 px-4 bg-white border-2 border-gray-200 rounded-xl text-lg font-bold text-center focus:border-red-400 focus:outline-none"
                style={{ direction: 'ltr' }}
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
                ر.س
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Summary & Pay Button */}
        {selectedCase && amount && (
          <div className="animate-fadeIn">
            <div className="bg-white rounded-xl p-4 mb-5 shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-3">ملخص المساهمة</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">القضية</span>
                  <span className="font-semibold text-sm">{selectedCase.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">المستفيد</span>
                  <span className="font-semibold">{isOnBehalf ? beneficiaryName : 'أنت'}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-700 font-semibold">الإجمالي</span>
                  <span className="text-xl font-bold text-red-600">{parseInt(amount).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={submitting}
              className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3 ${
                submitting
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-rose-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري الدفع...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  تأكيد المساهمة - {parseInt(amount).toLocaleString('ar-SA')} ر.س
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default DiyaPayment

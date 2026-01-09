/**
 * BankTransferPayment - صفحة التحويل البنكي
 * 
 * Features:
 * - Select payment purpose
 * - Enter amount
 * - Upload receipt image
 * - Submit for admin review
 * - Pay for self or another member
 * 
 * Created: December 2025
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ArrowRight, 
  Building2,
  Check,
  AlertCircle,
  Upload,
  Image,
  X,
  User,
  Users,
  Clock,
  FileText
} from 'lucide-react'
import { useAuth } from '../App'
import { useDataCache } from '../contexts/DataCacheContext'
import BottomNav from '../components/BottomNav'
import paymentService from '../services/paymentService'

// Payment purposes
const PAYMENT_PURPOSES = [
  { id: 'subscription', label: 'اشتراك شهري', icon: '💰' },
  { id: 'diya', label: 'مساهمة في الدية', icon: '⚖️' },
  { id: 'initiative', label: 'مساهمة في مبادرة', icon: '🤝' },
  { id: 'general', label: 'دفعة عامة', icon: '💳' }
]

const BankTransferPayment = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { invalidateCache } = useDataCache()

  // Get beneficiary from URL params
  const isOnBehalf = searchParams.get('is_on_behalf') === 'true'
  const beneficiaryId = searchParams.get('beneficiary_id')
  const beneficiaryName = searchParams.get('beneficiary_name')

  // State
  const [purpose, setPurpose] = useState(null)
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setError('يرجى اختيار صورة (JPG, PNG) أو ملف PDF')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الملف يجب أن يكون أقل من 5 ميجابايت')
        return
      }

      setReceipt(file)
      setError(null)

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setReceiptPreview(reader.result)
        }
        reader.readAsDataURL(file)
      } else {
        setReceiptPreview(null)
      }
    }
  }

  // Remove selected file
  const handleRemoveFile = () => {
    setReceipt(null)
    setReceiptPreview(null)
  }

  // Handle amount change
  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setAmount(value)
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!purpose) {
      setError('يرجى اختيار الغرض من التحويل')
      return
    }
    if (!amount || parseInt(amount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح')
      return
    }
    if (!receipt) {
      setError('يرجى رفع صورة الإيصال')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('beneficiary_id', isOnBehalf ? beneficiaryId : user?.id)
      formData.append('amount', amount)
      formData.append('purpose', purpose.id)
      formData.append('is_on_behalf', isOnBehalf.toString())
      formData.append('receipt', receipt)
      if (notes) formData.append('notes', notes)

      const response = await paymentService.submitBankTransfer(formData)
      
      if (response?.success) {
        setSuccess(true)
        invalidateCache('payments')
      } else {
        setError(response?.message || 'حدث خطأ في إرسال الطلب')
      }
    } catch (err) {
      console.error('Submission error:', err)
      setError(err.response?.data?.message || 'حدث خطأ في إرسال الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  // Success Screen (Pending Review)
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-500 to-orange-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl animate-scaleIn">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Clock size={40} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تم إرسال الطلب! ⏳</h2>
          <p className="text-gray-500 mb-6">
            سيتم مراجعة طلبك من الإدارة المالية
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 justify-center">
              <Clock size={20} className="text-amber-600" />
              <span className="text-amber-700 font-semibold">قيد المراجعة</span>
            </div>
            <p className="text-amber-600 text-sm mt-2">
              سيتم إشعارك عند اعتماد التحويل
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-right">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">المبلغ</span>
              <span className="font-bold text-gray-800">{parseInt(amount).toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">الغرض</span>
              <span className="font-bold text-gray-800">{purpose?.label}</span>
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
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 pt-14 pb-8">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="back-button ml-3">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">تحويل بنكي</h1>
            <p className="text-white/70 text-sm">ارفع إيصال التحويل للمراجعة</p>
          </div>
        </div>

        {/* Icon */}
        <div className="flex justify-center mt-2">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Building2 size={32} className="text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4">
        {/* Beneficiary Info */}
        <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${
          isOnBehalf 
            ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200' 
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isOnBehalf ? 'bg-pink-500' : 'bg-amber-500'
          }`}>
            {isOnBehalf ? <Users size={24} className="text-white" /> : <User size={24} className="text-white" />}
          </div>
          <div>
            <p className={`text-sm ${isOnBehalf ? 'text-pink-600' : 'text-amber-600'}`}>
              {isOnBehalf ? '👥 التحويل نيابة عن' : '👤 التحويل لنفسي'}
            </p>
            <p className="font-bold text-gray-800">
              {isOnBehalf ? beneficiaryName : (user?.full_name_ar || user?.name || 'أنت')}
            </p>
          </div>
        </div>

        {/* Purpose Selection */}
        <div className="mb-5">
          <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
            <FileText size={18} />
            الغرض من التحويل
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_PURPOSES.map(p => (
              <button
                key={p.id}
                onClick={() => setPurpose(p)}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  purpose?.id === p.id
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-400 shadow-lg'
                    : 'bg-white border-gray-200 hover:border-amber-200'
                }`}
              >
                <span className="text-2xl mb-2 block">{p.icon}</span>
                <span className={`font-semibold ${purpose?.id === p.id ? 'text-amber-700' : 'text-gray-700'}`}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-5">
          <h3 className="text-gray-700 font-semibold mb-3">مبلغ التحويل</h3>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="أدخل المبلغ"
              className="w-full py-4 px-4 bg-white border-2 border-gray-200 rounded-xl text-lg font-bold text-center focus:border-amber-400 focus:outline-none"
              style={{ direction: 'ltr' }}
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
              ر.س
            </span>
          </div>
        </div>

        {/* Receipt Upload */}
        <div className="mb-5">
          <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
            <Upload size={18} />
            صورة الإيصال <span className="text-red-500">*</span>
          </h3>
          
          {!receipt ? (
            <label className="block">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload size={28} className="text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold mb-1">اضغط لرفع صورة الإيصال</p>
                <p className="text-gray-400 text-sm">JPG, PNG أو PDF (أقل من 5MB)</p>
              </div>
            </label>
          ) : (
            <div className="relative bg-white rounded-xl border-2 border-amber-200 p-4">
              <button
                onClick={handleRemoveFile}
                className="absolute top-2 left-2 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center z-10"
              >
                <X size={16} className="text-red-500" />
              </button>
              
              {receiptPreview ? (
                <img 
                  src={receiptPreview} 
                  alt="الإيصال" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <FileText size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{receipt.name}</p>
                    <p className="text-gray-500 text-sm">
                      {(receipt.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-3 text-green-600">
                <Check size={16} />
                <span className="text-sm font-semibold">تم رفع الإيصال بنجاح</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes (Optional) */}
        <div className="mb-5">
          <h3 className="text-gray-700 font-semibold mb-3">ملاحظات (اختياري)</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أضف أي ملاحظات..."
            className="w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-xl resize-none h-24 focus:border-amber-400 focus:outline-none"
            style={{ direction: 'rtl' }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Info Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-amber-700 text-sm text-center">
            ⏳ سيتم مراجعة الإيصال من الإدارة المالية واعتماده خلال 24-48 ساعة
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!purpose || !amount || !receipt || submitting}
          className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3 ${
            purpose && amount && receipt && !submitting
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              جاري الإرسال...
            </>
          ) : (
            <>
              <Upload size={20} />
              إرسال للمراجعة
            </>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

export default BankTransferPayment

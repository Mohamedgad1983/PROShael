/**
 * MemberSearchField Component - مكون البحث عن الأعضاء
 * Reusable component for searching and selecting members
 *
 * Features:
 * - Debounced search (300ms)
 * - Search by: membership_number, full_name_ar, phone
 * - Shows member card after selection
 * - Privacy: Balance is NOT shown for other members
 *
 * Created: December 2025
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, User, X, Check, AlertCircle, Phone } from 'lucide-react'
import paymentService from '../services/paymentService'

const MemberSearchField = ({
  onSelect,
  onClear,
  selectedMember = null,
  placeholder = "ابحث برقم العضوية أو الاسم أو الهاتف...",
  disabled = false,
  className = ""
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchMembers = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await paymentService.searchMembers(searchQuery, 10)
      if (response?.success && response?.data) {
        setResults(response.data)
        setShowDropdown(true)
      } else {
        setResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('حدث خطأ في البحث')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      searchMembers(value)
    }, 300)
  }

  const handleSelect = (member) => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
    onSelect(member)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
    if (onClear) onClear()
  }

  if (selectedMember) {
    return (
      <div className={`selected-member-card ${className}`}>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={16} className="text-white" />
              </div>
              <span className="text-green-700 font-semibold text-sm">تم اختيار العضو</span>
            </div>
            <button onClick={handleClear} className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center" disabled={disabled}>
              <X size={16} className="text-red-500" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">{selectedMember.full_name_ar?.charAt(0) || 'ع'}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-base">{selectedMember.full_name_ar || 'عضو'}</h4>
              <p className="text-gray-500 text-sm" style={{ direction: 'ltr', textAlign: 'right' }}>{selectedMember.membership_number || 'SH-0000'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`member-search-field relative ${className}`} ref={searchRef}>
      <div className="relative">
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {loading ? (<div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>) : (<Search size={20} className="text-gray-400" />)}
        </div>
        <input type="text" value={query} onChange={handleInputChange} placeholder={placeholder} disabled={disabled} className="w-full pr-12 pl-4 py-4 bg-white border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:outline-none transition-colors" style={{ direction: 'rtl' }} />
      </div>
      {error && (<div className="mt-2 flex items-center gap-2 text-red-500 text-sm"><AlertCircle size={14} /><span>{error}</span></div>)}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-y-auto animate-fadeIn">
          {results.length > 0 ? (
            results.map((member, index) => (
              <div key={member.id || index} onClick={() => handleSelect(member)} className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{member.full_name_ar?.charAt(0) || 'ع'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 truncate">{member.full_name_ar || 'عضو'}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span style={{ direction: 'ltr' }}>{member.membership_number || 'N/A'}</span>
                    {member.phone && (<><span>•</span><span className="flex items-center gap-1"><Phone size={12} /><span style={{ direction: 'ltr' }}>{member.phone}</span></span></>)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-400">
              <User size={32} className="mx-auto mb-2 opacity-50" />
              <p>لا توجد نتائج</p>
              <p className="text-xs mt-1">جرب البحث باسم مختلف أو رقم العضوية</p>
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400 text-center">ابحث برقم العضوية (SH-0001) أو الاسم أو رقم الهاتف</p>
    </div>
  )
}

export default MemberSearchField

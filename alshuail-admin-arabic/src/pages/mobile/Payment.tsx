// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCardIcon,
  UserIcon,
  CameraIcon,
  PhotoIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import BottomNav from '../../components/mobile/BottomNav';
import ReceiptUpload from './ReceiptUpload';
import { logger } from '../../utils/logger';

import '../../styles/mobile/Payment.css';

interface MemberSearchResult {
  id: string;
  full_name: string;
  membership_number: string;
  phone: string;
  tribal_section?: string;
}

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const [paymentMode, setPaymentMode] = useState<'self' | 'behalf'>('self');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ amount?: string; member?: string }>({});

  // Debounced search
  useEffect(() => {
    if (paymentMode === 'behalf' && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchMembers();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, paymentMode]);

  const searchMembers = async () => {
    try {
      setSearching(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      const response = await fetch(
        `${apiUrl}/api/member/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Handle both data structures (array or object with data property)
        const members = Array.isArray(data) ? data : (data.data || []);
        setSearchResults(members);
      }
    } catch (error) {
      logger.error('Error searching members:', { error });
      // Set sample data for testing
      setSearchResults([
        { id: '1', full_name: 'محمد أحمد الشعيل', membership_number: 'M-102', phone: '0501234567', tribal_section: 'آل محمد' },
        { id: '2', full_name: 'عبدالله سالم الشعيل', membership_number: 'M-103', phone: '0502345678', tribal_section: 'آل سالم' }
      ]);
    } finally {
      setSearching(false);
    }
  };

  const validateForm = () => {
    const newErrors: { amount?: string; member?: string } = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'الرجاء إدخال مبلغ صحيح';
    }

    if (paymentMode === 'behalf' && !selectedMember) {
      newErrors.member = 'الرجاء اختيار العضو';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      const payload = {
        amount: parseFloat(amount),
        notes,
        receipt_url: receiptUrl,
        ...(paymentMode === 'behalf' && selectedMember && {
          on_behalf_of: selectedMember.id,
        }),
      };

      const response = await fetch(`${apiUrl}/api/member/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowSuccess(true);
        // Reset form after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
          resetForm();
          navigate('/mobile/payment-history');
        }, 3000);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'حدث خطأ في إرسال الدفعة');
      }
    } catch (error) {
      logger.error('Error submitting payment:', { error });
      alert('حدث خطأ في إرسال الدفعة');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setNotes('');
    setSearchQuery('');
    setSelectedMember(null);
    setReceiptUrl(null);
    setErrors({});
  };

  const handleReceiptUpload = (url: string) => {
    setReceiptUrl(url);
    setShowReceiptUpload(false);
  };

  const formatAmount = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Add thousand separators
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="mobile-payment">
      {/* Header */}
      <div className="payment-header">
        <h1>دفعة جديدة</h1>
      </div>

      {/* Payment Mode Selector */}
      <div className="payment-mode-selector">
        <button
          className={`mode-btn ${paymentMode === 'self' ? 'active' : ''}`}
          onClick={() => {
            setPaymentMode('self');
            setSelectedMember(null);
            setSearchQuery('');
          }}
        >
          <UserIcon className="icon" />
          <span>دفع لنفسي</span>
        </button>
        <button
          className={`mode-btn ${paymentMode === 'behalf' ? 'active' : ''}`}
          onClick={() => setPaymentMode('behalf')}
        >
          <CreditCardIcon className="icon" />
          <span>دفع عن شخص آخر</span>
        </button>
      </div>

      <motion.div
        className="payment-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Member Search (for behalf mode) */}
        {paymentMode === 'behalf' && (
          <div className="form-group">
            <label>البحث عن العضو</label>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الجوال أو رقم العضوية"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={errors.member ? 'error' : ''}
              />
              {searching && <div className="search-loading">جاري البحث...</div>}
              {searchQuery && (
                <button
                  className="clear-search"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedMember(null);
                  }}
                >
                  <XMarkIcon className="icon" />
                </button>
              )}
            </div>
            {errors.member && <span className="error-message">{errors.member}</span>}

            {/* Search Results */}
            {searchResults.length > 0 && !selectedMember && (
              <div className="search-results">
                {searchResults.map(member => (
                  <div
                    key={member.id}
                    className="search-result-item"
                    onClick={() => {
                      setSelectedMember(member);
                      setSearchQuery(member.full_name);
                      setSearchResults([]);
                    }}
                  >
                    <div className="member-name">{member.full_name}</div>
                    <div className="member-details">
                      <span>رقم العضوية: {member.membership_number}</span>
                      <span>{member.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Member */}
            {selectedMember && (
              <div className="selected-member">
                <CheckCircleIcon className="check-icon" />
                <div className="member-info">
                  <div className="name">{selectedMember.full_name}</div>
                  <div className="details">
                    عضو رقم: {selectedMember.membership_number}
                  </div>
                </div>
                <button
                  className="change-btn"
                  onClick={() => {
                    setSelectedMember(null);
                    setSearchQuery('');
                  }}
                >
                  تغيير
                </button>
              </div>
            )}
          </div>
        )}

        {/* Amount Input */}
        <div className="form-group">
          <label>
            <BanknotesIcon className="icon" />
            المبلغ (ريال سعودي)
          </label>
          <div className="amount-input-wrapper">
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={errors.amount ? 'error' : ''}
            />
            <span className="currency">ريال</span>
          </div>
          {errors.amount && <span className="error-message">{errors.amount}</span>}
        </div>

        {/* Notes */}
        <div className="form-group">
          <label>ملاحظات (اختياري)</label>
          <textarea
            placeholder="أضف أي ملاحظات إضافية هنا..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Receipt Upload */}
        <div className="form-group">
          <label>إيصال الدفع</label>
          <div className="receipt-actions">
            {!receiptUrl ? (
              <button
                className="upload-btn"
                onClick={() => setShowReceiptUpload(true)}
              >
                <CameraIcon className="icon" />
                <span>رفع الإيصال</span>
              </button>
            ) : (
              <div className="receipt-uploaded">
                <CheckCircleIcon className="success-icon" />
                <span>تم رفع الإيصال بنجاح</span>
                <button
                  className="change-receipt"
                  onClick={() => setShowReceiptUpload(true)}
                >
                  تغيير
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <div className="btn-spinner"></div>
              <span>جاري الإرسال...</span>
            </>
          ) : (
            <>
              <CreditCardIcon className="icon" />
              <span>إرسال الدفعة</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Receipt Upload Modal */}
      {showReceiptUpload && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setShowReceiptUpload(false)}
            >
              <XMarkIcon className="icon" />
            </button>
            <ReceiptUpload onUploadComplete={handleReceiptUpload} />
          </div>
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="success-modal"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <div className="success-icon">
                <CheckCircleIcon className="icon" />
              </div>
              <h2>تم إرسال الدفعة بنجاح</h2>
              <p>سيتم مراجعة الدفعة واعتمادها قريباً</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Payment;
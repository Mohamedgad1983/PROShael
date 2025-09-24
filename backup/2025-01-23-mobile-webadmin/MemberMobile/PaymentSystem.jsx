import React, { useState } from 'react';
import {
  WalletIcon,
  BanknotesIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  HeartIcon,
  SparklesIcon,
  UserGroupIcon,
  CreditCardIcon,
  CameraIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Account Statement Screen Component
export const AccountStatementScreen = ({ memberData, onBack }) => {
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('month');

  const transactions = [
    {
      id: 'tx_001',
      date: '2024-01-15',
      hijriDate: '10 رجب 1445',
      type: 'credit',
      category: 'subscription',
      description: 'دفع اشتراك شهري',
      amount: 150,
      balance: 2650,
      reference: 'SUB-2024-001',
      status: 'completed'
    },
    {
      id: 'tx_002',
      date: '2024-01-10',
      hijriDate: '5 رجب 1445',
      type: 'debit',
      category: 'initiative',
      description: 'تبرع لمبادرة كسوة العيد',
      amount: -500,
      balance: 2500,
      reference: 'INIT-2024-789',
      status: 'completed',
      receipt: true
    },
    {
      id: 'tx_003',
      date: '2024-01-08',
      hijriDate: '3 رجب 1445',
      type: 'debit',
      category: 'diya',
      description: 'مساهمة في دية',
      amount: -1000,
      balance: 3000,
      reference: 'DIYA-2024-345',
      status: 'completed'
    },
    {
      id: 'tx_004',
      date: '2024-01-05',
      hijriDate: '29 جمادى الآخرة 1445',
      type: 'credit',
      category: 'transfer',
      description: 'تحويل من أحمد الشعيل',
      amount: 250,
      balance: 4000,
      fromMember: 'أحمد الشعيل',
      status: 'completed'
    },
    {
      id: 'tx_005',
      date: '2024-01-01',
      hijriDate: '25 جمادى الآخرة 1445',
      type: 'debit',
      category: 'transfer',
      description: 'تحويل إلى خالد الشعيل',
      amount: -300,
      balance: 3750,
      toMember: 'خالد الشعيل',
      status: 'completed',
      receipt: true
    },
    {
      id: 'tx_006',
      date: '2023-12-28',
      hijriDate: '21 جمادى الآخرة 1445',
      type: 'credit',
      category: 'deposit',
      description: 'إيداع نقدي',
      amount: 2000,
      balance: 4050,
      reference: 'DEP-2023-998',
      status: 'completed'
    }
  ];

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    if (filterType === 'credit') return tx.type === 'credit';
    if (filterType === 'debit') return tx.type === 'debit';
    return tx.category === filterType;
  });

  const totalCredit = transactions.filter(tx => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0);
  const totalDebit = Math.abs(transactions.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0));

  return (
    <div className="account-statement-screen">
      {/* Header */}
      <div className="statement-header">
        <button className="back-btn" onClick={onBack}>
          ←
        </button>
        <h2>كشف الحساب</h2>
        <button className="download-btn">
          <DocumentTextIcon />
        </button>
      </div>

      {/* Account Summary */}
      <div className="account-summary-card">
        <div className="summary-header">
          <h3>ملخص الحساب</h3>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
            <option value="quarter">آخر 3 شهور</option>
            <option value="year">آخر سنة</option>
          </select>
        </div>

        <div className="summary-stats">
          <div className="stat-item credit">
            <span className="stat-label">إجمالي الإيداعات</span>
            <span className="stat-value">+{totalCredit.toLocaleString()} ريال</span>
          </div>
          <div className="stat-item debit">
            <span className="stat-label">إجمالي المسحوبات</span>
            <span className="stat-value">-{totalDebit.toLocaleString()} ريال</span>
          </div>
          <div className="stat-item balance">
            <span className="stat-label">الرصيد الحالي</span>
            <span className="stat-value">{memberData.balance.toLocaleString()} ريال</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          الكل
        </button>
        <button
          className={`filter-tab ${filterType === 'credit' ? 'active' : ''}`}
          onClick={() => setFilterType('credit')}
        >
          إيداعات
        </button>
        <button
          className={`filter-tab ${filterType === 'debit' ? 'active' : ''}`}
          onClick={() => setFilterType('debit')}
        >
          مسحوبات
        </button>
        <button
          className={`filter-tab ${filterType === 'initiative' ? 'active' : ''}`}
          onClick={() => setFilterType('initiative')}
        >
          مبادرات
        </button>
        <button
          className={`filter-tab ${filterType === 'diya' ? 'active' : ''}`}
          onClick={() => setFilterType('diya')}
        >
          ديات
        </button>
      </div>

      {/* Transaction List */}
      <div className="transactions-list">
        {filteredTransactions.map(transaction => (
          <div key={transaction.id} className="transaction-card">
            <div className="transaction-header">
              <div className="transaction-icon-wrapper">
                {transaction.category === 'subscription' && <CreditCardIcon className="transaction-icon subscription" />}
                {transaction.category === 'initiative' && <HeartIcon className="transaction-icon initiative" />}
                {transaction.category === 'diya' && <SparklesIcon className="transaction-icon diya" />}
                {transaction.category === 'transfer' && <UserGroupIcon className="transaction-icon transfer" />}
                {transaction.category === 'deposit' && <WalletIcon className="transaction-icon deposit" />}
              </div>
              <div className="transaction-info">
                <h4 className="transaction-description">{transaction.description}</h4>
                <div className="transaction-meta">
                  <span className="transaction-date">{transaction.hijriDate} | {transaction.date}</span>
                  <span className="transaction-ref">#{transaction.reference}</span>
                </div>
                {transaction.fromMember && (
                  <div className="transaction-member">
                    <UserIcon className="member-icon" />
                    <span>من: {transaction.fromMember}</span>
                  </div>
                )}
                {transaction.toMember && (
                  <div className="transaction-member">
                    <UserIcon className="member-icon" />
                    <span>إلى: {transaction.toMember}</span>
                  </div>
                )}
              </div>
              <div className="transaction-amount-section">
                <span className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'credit' ? '+' : ''}{transaction.amount.toLocaleString()} ريال
                </span>
                <span className="transaction-balance">الرصيد: {transaction.balance.toLocaleString()}</span>
                {transaction.receipt && (
                  <button className="receipt-btn">
                    <DocumentTextIcon />
                    <span>إيصال</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Balance Card with Minimum Balance
export const EnhancedBalanceCard = ({ memberData, onPaymentClick, onStatementClick }) => {
  const isLowBalance = memberData.balance < memberData.minimumBalance;
  const progressPercentage = Math.min((memberData.balance / memberData.minimumBalance) * 100, 100);
  const remainingAmount = Math.max(memberData.minimumBalance - memberData.balance, 0);

  return (
    <>
      <div className={`balance-card ${isLowBalance ? 'low-balance' : ''}`}>
        <div className="balance-header">
          <WalletIcon className="balance-icon" />
          <h3>رصيد الحساب</h3>
          {isLowBalance && (
            <span className="balance-warning">
              <InformationCircleIcon className="warning-icon" />
              <span>أقل من الحد المطلوب</span>
            </span>
          )}
        </div>
        <div className="balance-amount">
          <span className="currency">ريال</span>
          <span className={`amount ${isLowBalance ? 'insufficient' : 'sufficient'}`}>
            {memberData.balance.toLocaleString()}
          </span>
        </div>
        {isLowBalance && (
          <div className="minimum-balance-info">
            <div className="progress-to-minimum">
              <div className="progress-bar-minimum">
                <div
                  className="progress-fill-minimum"
                  style={{width: `${progressPercentage}%`}}
                ></div>
              </div>
              <span className="remaining-amount">
                يتبقى {remainingAmount.toLocaleString()} ريال للوصول للحد المطلوب ({memberData.minimumBalance.toLocaleString()} ريال)
              </span>
            </div>
          </div>
        )}
        <div className="balance-actions">
          <button className="pay-btn" onClick={onPaymentClick}>
            <BanknotesIcon />
            <span>دفع الآن</span>
          </button>
          <button className="statement-btn" onClick={onStatementClick}>
            <DocumentTextIcon />
            <span>كشف حساب</span>
          </button>
        </div>
      </div>

      {/* Quick Payment Actions */}
      <div className="quick-payment-section">
        <h3 className="section-title">المدفوعات السريعة</h3>
        <div className="payment-options-grid">
          <button
            className="payment-option-card"
            onClick={() => onPaymentClick('initiative')}
          >
            <HeartIcon className="option-icon initiative" />
            <span>تبرع لمبادرة</span>
          </button>
          <button
            className="payment-option-card"
            onClick={() => onPaymentClick('diya')}
          >
            <SparklesIcon className="option-icon diya" />
            <span>دفع دية</span>
          </button>
          <button
            className="payment-option-card"
            onClick={() => onPaymentClick('member')}
          >
            <UserGroupIcon className="option-icon member" />
            <span>تحويل لعضو</span>
          </button>
          <button
            className="payment-option-card"
            onClick={() => onPaymentClick('subscription')}
          >
            <CreditCardIcon className="option-icon subscription" />
            <span>دفع اشتراك</span>
          </button>
        </div>
      </div>
    </>
  );
};

// Payment Modal Component with Auto-complete Member Search
export const PaymentModal = ({ show, onClose, paymentData, onPaymentDataChange }) => {
  const [step, setStep] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mock member database with complete details
  const membersDatabase = [
    {
      id: 'member_001',
      firstName: 'أحمد',
      lastName: 'الشعيل',
      fullName: 'أحمد محمد الشعيل',
      memberId: 'MEM001',
      phone: '0501234567',
      balance: 3500,
      subscriptionStatus: 'active'
    },
    {
      id: 'member_002',
      firstName: 'خالد',
      lastName: 'العنزي',
      fullName: 'خالد عبدالله العنزي',
      memberId: 'MEM002',
      phone: '0507654321',
      balance: 2100,
      subscriptionStatus: 'active'
    },
    {
      id: 'member_003',
      firstName: 'عبدالله',
      lastName: 'الشعيل',
      fullName: 'عبدالله سعود الشعيل',
      memberId: 'MEM003',
      phone: '0509876543',
      balance: 4200,
      subscriptionStatus: 'active'
    },
    {
      id: 'member_004',
      firstName: 'فهد',
      lastName: 'العنزي',
      fullName: 'فهد محمد العنزي',
      memberId: 'MEM004',
      phone: '0503456789',
      balance: 1800,
      subscriptionStatus: 'pending'
    },
    {
      id: 'member_005',
      firstName: 'محمد',
      lastName: 'الشعيل',
      fullName: 'محمد سالم الشعيل',
      memberId: 'MEM005',
      phone: '0505678901',
      balance: 5000,
      subscriptionStatus: 'active'
    }
  ];

  // Handle member search with auto-complete
  const handleMemberSearch = (searchTerm) => {
    setMemberSearch(searchTerm);

    if (searchTerm.length > 0) {
      // Search by first name, last name, or full name
      const results = membersDatabase.filter(member => {
        const searchLower = searchTerm.toLowerCase();
        return member.firstName.toLowerCase().includes(searchLower) ||
               member.lastName.toLowerCase().includes(searchLower) ||
               member.fullName.toLowerCase().includes(searchLower) ||
               `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchLower);
      });

      setSearchResults(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  // Handle member selection from suggestions
  const selectMember = (member) => {
    setMemberSearch(member.fullName);
    setShowSuggestions(false);

    // Auto-fill all member details
    onPaymentDataChange({
      ...paymentData,
      recipientId: member.id,
      recipientName: member.fullName,
      recipientDetails: {
        memberId: member.memberId,
        phone: member.phone,
        balance: member.balance,
        subscriptionStatus: member.subscriptionStatus
      }
    });
  };

  if (!show) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceipt(file);
      onPaymentDataChange({...paymentData, receipt: file});
    }
  };

  const handleConfirmPayment = () => {
    // Process payment
    alert(`تم الدفع بنجاح: ${paymentData.amount} ريال`);
    onClose();
    setStep(1);
    setReceipt(null);
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {paymentData.type === 'initiative' && 'التبرع لمبادرة'}
            {paymentData.type === 'diya' && 'دفع دية'}
            {paymentData.type === 'member' && 'تحويل لعضو'}
            {paymentData.type === 'subscription' && 'دفع اشتراك'}
          </h2>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Step 1: Amount and Details */}
          {step === 1 && (
            <div className="payment-step">
              <h3>المبلغ المطلوب</h3>
              <div className="amount-input-group">
                <label>أدخل المبلغ (الحد الأدنى 50 ريال)</label>
                <div className="amount-input-wrapper">
                  <input
                    type="number"
                    min="50"
                    value={paymentData.amount}
                    onChange={(e) => onPaymentDataChange({
                      ...paymentData,
                      amount: Math.max(50, parseInt(e.target.value) || 50)
                    })}
                    className="amount-input"
                  />
                  <span className="currency-label">ريال</span>
                </div>
                <div className="quick-amounts">
                  <button onClick={() => onPaymentDataChange({...paymentData, amount: 50})}>50 ريال</button>
                  <button onClick={() => onPaymentDataChange({...paymentData, amount: 100})}>100 ريال</button>
                  <button onClick={() => onPaymentDataChange({...paymentData, amount: 500})}>500 ريال</button>
                  <button onClick={() => onPaymentDataChange({...paymentData, amount: 1000})}>1000 ريال</button>
                </div>
              </div>

              {/* Pay for Another Member Option - Available for Initiatives, Diyas, and Subscriptions */}
              {(paymentData.type === 'initiative' || paymentData.type === 'diya' || paymentData.type === 'subscription') && (
                <div className="pay-for-section">
                  <label>الدفع عن:</label>
                  <div className="pay-for-options">
                    <button
                      type="button"
                      className={`option-btn ${paymentData.payingFor === 'self' ? 'active' : ''}`}
                      onClick={() => onPaymentDataChange({...paymentData, payingFor: 'self', recipientId: null, recipientName: null})}
                    >
                      نفسي
                    </button>
                    <button
                      type="button"
                      className={`option-btn ${paymentData.payingFor === 'other' ? 'active' : ''}`}
                      onClick={() => onPaymentDataChange({...paymentData, payingFor: 'other'})}
                    >
                      عضو آخر
                    </button>
                  </div>

                  {paymentData.payingFor === 'other' && (
                    <div className="member-selection">
                      <label>ابحث عن العضو بالاسم الأول والثاني:</label>
                      <div className="search-input-container">
                        <input
                          type="text"
                          className="member-search-input"
                          placeholder="مثال: أحمد الشعيل أو أحمد محمد"
                          value={memberSearch}
                          onChange={(e) => handleMemberSearch(e.target.value)}
                          onFocus={() => memberSearch && handleMemberSearch(memberSearch)}
                        />
                        <MagnifyingGlassIcon className="search-icon" />

                        {/* Auto-complete Suggestions */}
                        {showSuggestions && (
                          <div className="suggestions-dropdown">
                            {searchResults.map(member => (
                              <div
                                key={member.id}
                                className="suggestion-item"
                                onClick={() => selectMember(member)}
                              >
                                <div className="member-info">
                                  <div className="member-name">{member.fullName}</div>
                                  <div className="member-details">
                                    <span className="member-id">رقم العضوية: {member.memberId}</span>
                                    <span className="member-phone">{member.phone}</span>
                                  </div>
                                  {member.subscriptionStatus === 'active' ? (
                                    <span className="status-badge active">نشط</span>
                                  ) : (
                                    <span className="status-badge pending">معلق</span>
                                  )}
                                </div>
                                <div className="member-balance">
                                  <span className="balance-label">الرصيد:</span>
                                  <span className={`balance-amount ${member.balance >= 3000 ? 'sufficient' : 'low'}`}>
                                    {member.balance.toLocaleString()} ريال
                                  </span>
                                </div>
                              </div>
                            ))}
                            {searchResults.length === 0 && memberSearch.length > 0 && (
                              <div className="no-results">
                                لم يتم العثور على أعضاء بهذا الاسم
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected Member Details */}
                      {paymentData.recipientDetails && (
                        <div className="selected-member-card">
                          <h4>تفاصيل العضو المختار:</h4>
                          <div className="detail-row">
                            <span>الاسم:</span>
                            <span>{paymentData.recipientName}</span>
                          </div>
                          <div className="detail-row">
                            <span>رقم العضوية:</span>
                            <span>{paymentData.recipientDetails.memberId}</span>
                          </div>
                          <div className="detail-row">
                            <span>رقم الجوال:</span>
                            <span>{paymentData.recipientDetails.phone}</span>
                          </div>
                          <div className="detail-row">
                            <span>الرصيد الحالي:</span>
                            <span className={paymentData.recipientDetails.balance >= 3000 ? 'text-green' : 'text-red'}>
                              {paymentData.recipientDetails.balance.toLocaleString()} ريال
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {paymentData.type === 'initiative' && (
                <div className="initiative-section">
                  <label>اختر المبادرة</label>
                  <select className="initiative-select">
                    <option value="">اختر مبادرة...</option>
                    <option value="init_001">مبادرة دعم الطلاب الجامعيين</option>
                    <option value="init_002">مشروع بناء مسجد الحي</option>
                    <option value="init_003">مبادرة كسوة العيد</option>
                  </select>
                </div>
              )}

              <div className="description-section">
                <label>وصف المعاملة (اختياري)</label>
                <textarea
                  placeholder="أضف وصف للمعاملة..."
                  value={paymentData.description}
                  onChange={(e) => onPaymentDataChange({...paymentData, description: e.target.value})}
                  className="description-input"
                />
              </div>

              <button
                className="next-btn"
                onClick={() => setStep(2)}
                disabled={paymentData.type === 'member' && !paymentData.recipientId}
              >
                التالي
              </button>
            </div>
          )}

          {/* Step 2: Receipt Upload and Confirmation */}
          {step === 2 && (
            <div className="payment-step">
              <h3>إرفاق الإيصال (اختياري)</h3>
              <div className="receipt-upload-section">
                <label className="upload-area" htmlFor="receipt-upload">
                  {receipt ? (
                    <div className="file-preview">
                      <DocumentTextIcon className="file-icon" />
                      <span>{receipt.name}</span>
                      <button onClick={() => setReceipt(null)} className="remove-file">×</button>
                    </div>
                  ) : (
                    <>
                      <CameraIcon className="upload-icon" />
                      <span>اضغط لرفع الإيصال</span>
                      <small>PNG, JPG, PDF (حتى 5MB)</small>
                    </>
                  )}
                </label>
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  style={{display: 'none'}}
                />
              </div>

              <div className="payment-summary">
                <h4>ملخص المعاملة</h4>
                <div className="summary-item">
                  <span>النوع:</span>
                  <span>
                    {paymentData.type === 'initiative' && 'تبرع لمبادرة'}
                    {paymentData.type === 'diya' && 'دفع دية'}
                    {paymentData.type === 'member' && `تحويل إلى ${paymentData.recipientName}`}
                    {paymentData.type === 'subscription' && 'دفع اشتراك'}
                  </span>
                </div>
                {paymentData.payingFor === 'other' && paymentData.recipientName && (
                  <div className="summary-item highlight">
                    <span>الدفع عن:</span>
                    <span className="recipient-name">{paymentData.recipientName}</span>
                  </div>
                )}
                <div className="summary-item">
                  <span>المبلغ:</span>
                  <span>{paymentData.amount.toLocaleString()} ريال</span>
                </div>
                {paymentData.description && (
                  <div className="summary-item">
                    <span>الوصف:</span>
                    <span>{paymentData.description}</span>
                  </div>
                )}
                <div className="summary-item total">
                  <span>الإجمالي:</span>
                  <span>{paymentData.amount.toLocaleString()} ريال</span>
                </div>
              </div>

              <div className="action-buttons">
                <button className="back-btn" onClick={() => setStep(1)}>رجوع</button>
                <button className="confirm-btn" onClick={handleConfirmPayment}>
                  تأكيد الدفع
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default { AccountStatementScreen, EnhancedBalanceCard, PaymentModal };
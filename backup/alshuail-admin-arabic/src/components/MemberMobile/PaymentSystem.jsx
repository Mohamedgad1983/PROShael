import React, { useState } from 'react';
import PropTypes from 'prop-types';
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

  const balance = (memberData && typeof memberData.balance === 'number') ? memberData.balance : 0;

  return (
    <div className="account-statement-screen">
      <div className="statement-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>كشف الحساب</h2>
        <button className="download-btn">
          <DocumentTextIcon />
        </button>
      </div>

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
            <span className="stat-value">{balance.toLocaleString()} ريال</span>
          </div>
        </div>
      </div>

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
      </div>

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
                  {transaction.reference && <span className="transaction-ref">#{transaction.reference}</span>}
                </div>
              </div>
              <div className="transaction-amount-section">
                <span className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'credit' ? '+' : ''}{transaction.amount.toLocaleString()} ريال
                </span>
                <span className="transaction-balance">الرصيد: {transaction.balance.toLocaleString()}</span>
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
  // Defensive programming with proper null checks
  const balance = (memberData && typeof memberData.balance === 'number') ? memberData.balance : 0;
  const minimumBalance = (memberData && typeof memberData.minimumBalance === 'number') ? memberData.minimumBalance : 3000;
  const isLowBalance = balance < minimumBalance;
  const progressPercentage = Math.min((balance / minimumBalance) * 100, 100);
  const remainingAmount = Math.max(minimumBalance - balance, 0);

  return (
    <React.Fragment>
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
            {balance.toLocaleString()}
          </span>
        </div>
        {isLowBalance && (
          <div className="minimum-balance-info">
            <div className="progress-to-minimum">
              <div className="progress-bar-minimum">
                <div
                  className="progress-fill-minimum"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="remaining-amount">
                يتبقى {remainingAmount.toLocaleString()} ريال للوصول للحد المطلوب ({minimumBalance.toLocaleString()} ريال)
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
    </React.Fragment>
  );
};

// Payment Modal Component
export const PaymentModal = ({ show, onClose, paymentData = {}, onPaymentDataChange }) => {
  const [step, setStep] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    }
  ];

  const handleMemberSearch = (searchTerm) => {
    setMemberSearch(searchTerm);

    if (searchTerm.length > 0) {
      const results = membersDatabase.filter(member => {
        const searchLower = searchTerm.toLowerCase();
        return member.firstName.toLowerCase().includes(searchLower) ||
               member.lastName.toLowerCase().includes(searchLower) ||
               member.fullName.toLowerCase().includes(searchLower);
      });

      setSearchResults(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  const selectMember = (member) => {
    if (!member) return;

    setMemberSearch(member.fullName || '');
    setShowSuggestions(false);

    if (onPaymentDataChange) {
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
    }
  };

  if (!show) return null;

  const handleFileUpload = (e) => {
    if (!e || !e.target || !e.target.files) return;

    const file = e.target.files[0];
    if (file) {
      setReceipt(file);
      if (onPaymentDataChange) {
        onPaymentDataChange({ ...paymentData, receipt: file });
      }
    }
  };

  const handleConfirmPayment = () => {
    const amount = (paymentData && typeof paymentData.amount === 'number') ? paymentData.amount : 0;
    alert(`تم الدفع بنجاح: ${amount} ريال`);

    if (onClose) {
      onClose();
    }

    setStep(1);
    setReceipt(null);
  };

  const paymentAmount = (paymentData && typeof paymentData.amount === 'number') ? paymentData.amount : 0;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {paymentData.type === 'initiative' && 'التبرع لمبادرة'}
            {paymentData.type === 'diya' && 'دفع دية'}
            {paymentData.type === 'member' && 'تحويل لعضو'}
            {paymentData.type === 'subscription' && 'دفع اشتراك'}
            {!paymentData.type && 'دفع'}
          </h2>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="payment-step">
              <h3>المبلغ المطلوب</h3>
              <div className="amount-input-group">
                <label>أدخل المبلغ (الحد الأدنى 50 ريال)</label>
                <div className="amount-input-wrapper">
                  <input
                    type="number"
                    min="50"
                    value={paymentAmount}
                    onChange={(e) => {
                      if (onPaymentDataChange) {
                        onPaymentDataChange({
                          ...paymentData,
                          amount: Math.max(50, parseInt(e.target.value) || 50)
                        });
                      }
                    }}
                    className="amount-input"
                  />
                  <span className="currency-label">ريال</span>
                </div>
                <div className="quick-amounts">
                  <button onClick={() => onPaymentDataChange && onPaymentDataChange({ ...paymentData, amount: 50 })}>50 ريال</button>
                  <button onClick={() => onPaymentDataChange && onPaymentDataChange({ ...paymentData, amount: 100 })}>100 ريال</button>
                  <button onClick={() => onPaymentDataChange && onPaymentDataChange({ ...paymentData, amount: 500 })}>500 ريال</button>
                  <button onClick={() => onPaymentDataChange && onPaymentDataChange({ ...paymentData, amount: 1000 })}>1000 ريال</button>
                </div>
              </div>

              {(paymentData.type === 'member') && (
                <div className="member-selection">
                  <label>ابحث عن العضو:</label>
                  <div className="search-input-container">
                    <input
                      type="text"
                      className="member-search-input"
                      placeholder="مثال: أحمد الشعيل"
                      value={memberSearch}
                      onChange={(e) => handleMemberSearch(e.target.value)}
                    />
                    <MagnifyingGlassIcon className="search-icon" />

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
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="description-section">
                <label>وصف المعاملة (اختياري)</label>
                <textarea
                  placeholder="أضف وصف للمعاملة..."
                  value={paymentData.description || ''}
                  onChange={(e) => {
                    if (onPaymentDataChange) {
                      onPaymentDataChange({ ...paymentData, description: e.target.value });
                    }
                  }}
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
                    <React.Fragment>
                      <CameraIcon className="upload-icon" />
                      <span>اضغط لرفع الإيصال</span>
                      <small>PNG, JPG, PDF (حتى 5MB)</small>
                    </React.Fragment>
                  )}
                </label>
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="payment-summary">
                <h4>ملخص المعاملة</h4>
                <div className="summary-item">
                  <span>النوع:</span>
                  <span>
                    {paymentData.type === 'initiative' && 'تبرع لمبادرة'}
                    {paymentData.type === 'diya' && 'دفع دية'}
                    {paymentData.type === 'member' && `تحويل إلى ${paymentData.recipientName || 'عضو'}`}
                    {paymentData.type === 'subscription' && 'دفع اشتراك'}
                    {!paymentData.type && 'دفع'}
                  </span>
                </div>
                <div className="summary-item">
                  <span>المبلغ:</span>
                  <span>{paymentAmount.toLocaleString()} ريال</span>
                </div>
                {paymentData.description && (
                  <div className="summary-item">
                    <span>الوصف:</span>
                    <span>{paymentData.description}</span>
                  </div>
                )}
                <div className="summary-item total">
                  <span>الإجمالي:</span>
                  <span>{paymentAmount.toLocaleString()} ريال</span>
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

// PropTypes definitions
AccountStatementScreen.propTypes = {
  memberData: PropTypes.object,
  onBack: PropTypes.func.isRequired
};

AccountStatementScreen.defaultProps = {
  memberData: { balance: 0 }
};

EnhancedBalanceCard.propTypes = {
  memberData: PropTypes.object,
  onPaymentClick: PropTypes.func.isRequired,
  onStatementClick: PropTypes.func.isRequired
};

EnhancedBalanceCard.defaultProps = {
  memberData: { balance: 0, minimumBalance: 3000 }
};

PaymentModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  paymentData: PropTypes.object,
  onPaymentDataChange: PropTypes.func.isRequired
};

PaymentModal.defaultProps = {
  paymentData: { amount: 50, type: '', description: '' }
};

// Export components individually and as default
const PaymentSystemExports = {
  AccountStatementScreen,
  EnhancedBalanceCard,
  PaymentModal
};

export default PaymentSystemExports;
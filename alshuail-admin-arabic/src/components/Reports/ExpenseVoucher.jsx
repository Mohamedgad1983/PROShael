import React, { memo } from 'react';
import './ExpenseVoucher.css';
import logo from '../../assets/logo.svg';

const ExpenseVoucher = ({ expense, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a blob from the voucher HTML
    const voucherElement = document.getElementById('expense-voucher');
    const htmlContent = voucherElement.outerHTML;

    // Create HTML file with styles
    const fullHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>سند صرف - ${expense.title_ar}</title>
        <style>
          ${getVoucherStyles()}
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-voucher-${expense.id || Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getVoucherStyles = () => {
    return `
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 20px;
        direction: rtl;
      }
      .voucher-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        padding: 40px;
        border: 2px solid #333;
        border-radius: 10px;
      }
      .voucher-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 3px double #333;
        padding-bottom: 20px;
      }
      .voucher-logo img {
        width: 120px;
        height: 120px;
        margin-bottom: 20px;
      }
      .voucher-title {
        font-size: 28px;
        font-weight: bold;
        color: #1a1a1a;
        margin-bottom: 10px;
      }
      .voucher-number {
        font-size: 16px;
        color: #666;
      }
      .voucher-body {
        margin: 30px 0;
      }
      .voucher-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        padding: 15px;
        background: #f9f9f9;
        border-radius: 5px;
      }
      .voucher-label {
        font-weight: bold;
        color: #555;
        flex: 0 0 150px;
      }
      .voucher-value {
        flex: 1;
        color: #333;
        font-size: 16px;
      }
      .amount-section {
        background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        margin: 30px 0;
      }
      .amount-label {
        font-size: 18px;
        margin-bottom: 10px;
      }
      .amount-value {
        font-size: 36px;
        font-weight: bold;
      }
      .voucher-footer {
        margin-top: 40px;
        padding-top: 30px;
        border-top: 2px solid #ddd;
      }
      .signature-section {
        display: flex;
        justify-content: space-around;
        margin-top: 50px;
      }
      .signature-box {
        text-align: center;
        flex: 1;
      }
      .signature-line {
        border-bottom: 1px solid #333;
        width: 150px;
        margin: 0 auto 10px;
        height: 40px;
      }
      .signature-label {
        font-size: 14px;
        color: #666;
      }
      @media print {
        body {
          padding: 0;
        }
        .no-print {
          display: none !important;
        }
        .voucher-container {
          border: 1px solid #333;
          box-shadow: none;
        }
      }
    `;
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('ar-SA');
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  const formatHijriDate = (dateString) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getCategoryName = (category) => {
    const categories = {
      operations: 'تشغيلية',
      activities: 'أنشطة',
      maintenance: 'صيانة',
      utilities: 'مرافق',
      supplies: 'مستلزمات',
      travel: 'سفر',
      marketing: 'تسويق',
      other: 'أخرى'
    };
    return categories[category] || category;
  };

  const getStatusText = (status) => {
    const statuses = {
      pending: 'في الانتظار',
      approved: 'معتمد',
      rejected: 'مرفوض'
    };
    return statuses[status] || status;
  };

  return (
    <div className="voucher-modal">
      <div className="voucher-modal-content">
        <button className="close-modal no-print" onClick={onClose}>✕</button>

        <div id="expense-voucher" className="voucher-container">
          <div className="voucher-header">
            <div className="voucher-logo">
              <img
                src={logo}
                alt="Shuail Al-Anzi Fund"
                style={{
                  width: '120px',
                  height: '120px',
                  marginBottom: '20px'
                }}
              />
              <h1>صندوق شعيل العنزي</h1>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Shuail Al-Anzi Fund</p>
            </div>
            <div className="voucher-title">سند صرف</div>
            <div className="voucher-number">رقم السند: {expense.expense_number || expense.id || `EXP-${Date.now()}`}</div>
            <div className="voucher-date">
              التاريخ: {formatDate(expense.created_at)}
              {' '}
              ({formatHijriDate(expense.created_at)})
            </div>
          </div>

          <div className="voucher-body">
            <div className="voucher-row">
              <span className="voucher-label">عنوان المصروف:</span>
              <span className="voucher-value">{expense.title_ar}</span>
            </div>

            {expense.title_en && (
              <div className="voucher-row">
                <span className="voucher-label">العنوان (English):</span>
                <span className="voucher-value">{expense.title_en}</span>
              </div>
            )}

            <div className="voucher-row">
              <span className="voucher-label">الفئة:</span>
              <span className="voucher-value">{getCategoryName(expense.category)}</span>
            </div>

            <div className="voucher-row">
              <span className="voucher-label">الحالة:</span>
              <span className="voucher-value">
                <span className={`status-badge status-${expense.status}`}>
                  {getStatusText(expense.status)}
                </span>
              </span>
            </div>

            {expense.description_ar && (
              <div className="voucher-row">
                <span className="voucher-label">الوصف:</span>
                <span className="voucher-value">{expense.description_ar}</span>
              </div>
            )}

            {expense.notes && (
              <div className="voucher-row">
                <span className="voucher-label">ملاحظات:</span>
                <span className="voucher-value">{expense.notes}</span>
              </div>
            )}

            <div className="amount-section">
              <div className="amount-label">المبلغ المصروف</div>
              <div className="amount-value">
                {parseFloat(expense.amount || 0).toLocaleString('en-US')} ر.س
              </div>
            </div>

            {expense.created_by_name && (
              <div className="voucher-row">
                <span className="voucher-label">تم الإنشاء بواسطة:</span>
                <span className="voucher-value">{expense.created_by_name}</span>
              </div>
            )}

            {expense.approved_by_name && (
              <div className="voucher-row">
                <span className="voucher-label">تم الاعتماد بواسطة:</span>
                <span className="voucher-value">{expense.approved_by_name}</span>
              </div>
            )}

            {expense.rejection_reason && (
              <div className="voucher-row rejection-row">
                <span className="voucher-label">سبب الرفض:</span>
                <span className="voucher-value">{expense.rejection_reason}</span>
              </div>
            )}
          </div>

          <div className="voucher-footer">
            <div className="signature-section">
              <div className="signature-box">
                <div className="signature-line"></div>
                <div className="signature-label">المستلم</div>
              </div>
              <div className="signature-box">
                <div className="signature-line"></div>
                <div className="signature-label">المحاسب</div>
              </div>
              <div className="signature-box">
                <div className="signature-line"></div>
                <div className="signature-label">المدير المالي</div>
              </div>
            </div>

            <div className="voucher-stamp">
              <p style={{ textAlign: 'center', marginTop: '40px', color: '#999', fontSize: '12px' }}>
                هذا السند صادر من نظام إدارة عائلة الشعيل الإلكتروني
              </p>
            </div>
          </div>
        </div>

        <div className="voucher-actions no-print">
          <button onClick={handlePrint} className="print-btn">
            🖨️ طباعة السند
          </button>
          <button onClick={handleDownload} className="download-btn">
            📥 تحميل السند
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ExpenseVoucher);
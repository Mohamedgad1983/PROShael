import React, { memo,  useState, useRef, useEffect } from 'react';
// @ts-ignore
import ExpenseManagement from './ExpenseManagement';

import { logger } from '../../utils/logger';
import { API_BASE_URL } from '../../utils/apiConfig';

// Hijri date conversion helper
const getHijriDate = () => {
  // Get current date
  const today = new Date();

  // Simple Hijri conversion (approximate)
  // For production, you should use a proper Hijri conversion library
  const gregorianYear = today.getFullYear();
  const gregorianMonth = today.getMonth() + 1;
  const gregorianDay = today.getDate();

  // Approximate conversion (Hijri year = Gregorian year - 579)
  const hijriYear = Math.floor(gregorianYear - 579 + (gregorianMonth - 1) / 12);

  // Hijri month names
  const hijriMonths = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ];

  // Get approximate Hijri month (this is simplified)
  const hijriMonth = hijriMonths[today.getMonth()];

  return {
    year: hijriYear,
    month: hijriMonth,
    day: gregorianDay,
    formatted: `${gregorianDay} ${hijriMonth} ${hijriYear}هـ`,
    gregorian: today.toLocaleDateString('ar-SA')
  };
};

const FinancialReportsSimple: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [currentHijriDate, setCurrentHijriDate] = useState(getHijriDate());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Update Hijri date on component mount
    setCurrentHijriDate(getHijriDate());
  }, []);

  // Export to PDF
  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reports/forensic?format=pdf&report_type=comprehensive_forensic`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token'}`,
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('تم تصدير التقرير بنجاح!');
      } else {
        alert('خطأ في تصدير التقرير');
      }
    } catch (error) {
      logger.error('Export error:', { error });
      alert('خطأ في تصدير التقرير');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reports/forensic?format=excel&report_type=comprehensive_forensic`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token'}`,
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('تم تصدير التقرير بنجاح!');
      } else {
        alert('خطأ في تصدير التقرير');
      }
    } catch (error) {
      logger.error('Export error:', { error });
      alert('خطأ في تصدير التقرير');
    } finally {
      setLoading(false);
    }
  };

  // Handle file attachment
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
      alert(`تم إضافة ${newFiles.length} مرفق(ات)`);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ textAlign: 'left', color: '#666', fontSize: '14px' }}>
          <div>التاريخ الميلادي: {currentHijriDate.gregorian}</div>
        </div>
        <h1 style={{ fontSize: '24px', color: '#333', textAlign: 'right', margin: 0 }}>
          التقارير المالية - نظام التحليل الجنائي المتقدم
        </h1>
        <div style={{ textAlign: 'right', color: '#333', fontSize: '16px', fontWeight: 'bold' }}>
          <div style={{ color: '#4CAF50' }}>التاريخ الهجري: {currentHijriDate.formatted}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'dashboard' ? '#4CAF50' : '#ddd',
            color: activeTab === 'dashboard' ? 'white' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          لوحة القيادة
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'expenses' ? '#4CAF50' : '#ddd',
            color: activeTab === 'expenses' ? 'white' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          إدارة المصروفات
        </button>
        <button
          onClick={() => setActiveTab('forensic')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'forensic' ? '#4CAF50' : '#ddd',
            color: activeTab === 'forensic' ? 'white' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          التحليل الجنائي
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'reports' ? '#4CAF50' : '#ddd',
            color: activeTab === 'reports' ? 'white' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          التقارير والتصدير
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', minHeight: '300px' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', textAlign: 'right' }}>
              لوحة القيادة المالية - شهر {currentHijriDate.month} {currentHijriDate.year}هـ
            </h2>

            {/* Period Selector */}
            <div style={{ marginBottom: '15px', textAlign: 'right' }}>
              <select style={{
                padding: '8px 15px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                <option>شهر {currentHijriDate.month} {currentHijriDate.year}هـ</option>
                <option>ربع سنوي - ربيع الأول إلى جمادى الآخرة</option>
                <option>نصف سنوي - محرم إلى جمادى الآخرة</option>
                <option>سنة كاملة {currentHijriDate.year}هـ</option>
              </select>
            </div>

            {/* Financial Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
              <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>٥٠,٠٠٠ ريال</div>
                <div style={{ fontSize: '14px', color: '#666' }}>إجمالي الإيرادات</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  شهر {currentHijriDate.month}
                </div>
                <div style={{ fontSize: '11px', color: '#4CAF50', marginTop: '3px' }}>
                  ↑ ١٢٪ من شهر {currentHijriDate.month === 'محرم' ? 'ذو الحجة' : 'السابق'}
                </div>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>٣٠,٠٠٠ ريال</div>
                <div style={{ fontSize: '14px', color: '#666' }}>إجمالي المصروفات</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  شهر {currentHijriDate.month}
                </div>
                <div style={{ fontSize: '11px', color: '#4CAF50', marginTop: '3px' }}>
                  ↓ ٥٪ من شهر {currentHijriDate.month === 'محرم' ? 'ذو الحجة' : 'السابق'}
                </div>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>٢٠,٠٠٠ ريال</div>
                <div style={{ fontSize: '14px', color: '#666' }}>صافي الدخل</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  شهر {currentHijriDate.month}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                  هامش الربح: ٤٠٪
                </div>
              </div>
            </div>

            {/* Revenue Sources */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '10px', textAlign: 'right' }}>
                مصادر الإيرادات - {currentHijriDate.month} {currentHijriDate.year}هـ
              </h3>
              <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>الاشتراكات</span>
                  <span style={{ color: '#2196F3' }}>٢٥,٠٠٠ ريال</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>المبادرات</span>
                  <span style={{ color: '#2196F3' }}>١٥,٠٠٠ ريال</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>المناسبات</span>
                  <span style={{ color: '#2196F3' }}>٧,٠٠٠ ريال</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الديات</span>
                  <span style={{ color: '#2196F3' }}>٣,٠٠٠ ريال</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <ExpenseManagement
            dateFilter={{
              hijri_month: new Date().getMonth() + 1,
              hijri_year: currentHijriDate.year
            }}
            onExpenseChange={() => {
              // Refresh data if needed
              logger.debug('Expense changed');
            }}
          />
        )}

        {activeTab === 'forensic' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', textAlign: 'right' }}>
              التحليل الجنائي المالي - {currentHijriDate.month} {currentHijriDate.year}هـ
            </h2>

            {/* Forensic Analysis Options */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '5px', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '5px', color: '#9c27b0' }}>تحليل من دفع لمن</h3>
                <p style={{ fontSize: '12px', color: '#666' }}>تتبع جميع المدفوعات المتقاطعة بين الأعضاء</p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#e8eaf6', borderRadius: '5px', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '5px', color: '#3f51b5' }}>تحليل أنماط المساهمات</h3>
                <p style={{ fontSize: '12px', color: '#666' }}>دراسة أنماط المساهمات حسب العائلة والفترة</p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#fce4ec', borderRadius: '5px', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '5px', color: '#e91e63' }}>تحليل العلاقات المالية</h3>
                <p style={{ fontSize: '12px', color: '#666' }}>خريطة العلاقات المالية بين الأعضاء</p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#e0f2f1', borderRadius: '5px', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '5px', color: '#009688' }}>تحليل الامتثال</h3>
                <p style={{ fontSize: '12px', color: '#666' }}>مراجعة الامتثال والتحقق من المستندات</p>
              </div>
            </div>

            {/* Forensic Insights */}
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'right' }}>
                رؤى التحليل الجنائي - شهر {currentHijriDate.month}
              </h3>
              <ul style={{ textAlign: 'right', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>• تم تحديد ١٥ معاملة دفع متقاطع في شهر {currentHijriDate.month}</li>
                <li style={{ marginBottom: '8px' }}>• ٧ أعضاء دفعوا لآخرين من عائلات مختلفة</li>
                <li style={{ marginBottom: '8px' }}>• معدل الامتثال للوثائق: ٩٥٪</li>
                <li style={{ marginBottom: '8px' }}>• ٣ معاملات تحتاج مراجعة إضافية</li>
                <li>• آخر تحديث: {currentHijriDate.formatted}</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', textAlign: 'right' }}>التقارير والتصدير</h2>

            {/* Export Options */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'right' }}>خيارات التصدير</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={handleExportPDF}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: loading ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {loading ? 'جاري التصدير...' : '📄 تصدير PDF'}
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: loading ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {loading ? 'جاري التصدير...' : '📊 تصدير Excel'}
                </button>
              </div>
            </div>

            {/* Attachment Section */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'right' }}>المرفقات</h3>
              <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  📎 إضافة مرفق
                </button>

                {attachments.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ textAlign: 'right', marginBottom: '10px' }}>المرفقات المضافة:</p>
                    {attachments.map((file, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        backgroundColor: 'white',
                        borderRadius: '5px',
                        marginBottom: '5px'
                      }}>
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          حذف
                        </button>
                        <span style={{ fontSize: '14px' }}>
                          {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {attachments.length === 0 && (
                  <p style={{ textAlign: 'right', color: '#666', fontSize: '14px' }}>
                    لا توجد مرفقات حالياً. اضغط على زر "إضافة مرفق" لإضافة الملفات.
                  </p>
                )}
              </div>
            </div>

            {/* Report Types */}
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'right' }}>أنواع التقارير المتاحة</h3>
              <ul style={{ textAlign: 'right', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>✅ تقرير شامل مفصل</li>
                <li style={{ marginBottom: '8px' }}>✅ تحليل الإيرادات المفصل</li>
                <li style={{ marginBottom: '8px' }}>✅ تحليل المصروفات المفصل</li>
                <li style={{ marginBottom: '8px' }}>✅ تقرير الديات التفصيلي</li>
                <li style={{ marginBottom: '8px' }}>✅ تحليل علاقات الدفع</li>
                <li>✅ مساهمات الأعضاء المفصلة</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(FinancialReportsSimple);

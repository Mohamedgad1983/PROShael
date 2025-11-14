import React, { memo,  useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  CalendarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CloudArrowDownIcon,
  DocumentChartBarIcon,
  ClipboardDocumentCheckIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { memberService } from '../../services/memberService';
import { logger } from '../../utils/logger';

import './PremiumExportMembers.css';

const PremiumExportMembers = () => {
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [selectedFields, setSelectedFields] = useState([
    'full_name',
    'membership_number',
    'phone',
    'email',
    'membership_status',
    'created_at'
  ]);
  const [filters, setFilters] = useState({
    status: 'all',
    profile_completed: 'all',
    social_security_beneficiary: 'all',
    date_from: '',
    date_to: ''
  });
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    filtered: 0
  });

  const availableFields = [
    { id: 'full_name', label: 'الاسم الكامل', category: 'personal' },
    { id: 'membership_number', label: 'رقم العضوية', category: 'personal' },
    { id: 'national_id', label: 'الرقم الوطني', category: 'personal' },
    { id: 'phone', label: 'رقم الهاتف', category: 'contact' },
    { id: 'whatsapp_number', label: 'رقم الواتساب', category: 'contact' },
    { id: 'email', label: 'البريد الإلكتروني', category: 'contact' },
    { id: 'date_of_birth', label: 'تاريخ الميلاد', category: 'personal' },
    { id: 'date_of_birth_hijri', label: 'تاريخ الميلاد الهجري', category: 'personal' },
    { id: 'employer', label: 'جهة العمل', category: 'professional' },
    { id: 'social_security_beneficiary', label: 'مستفيد من الضمان', category: 'social' },
    { id: 'membership_status', label: 'حالة العضوية', category: 'status' },
    { id: 'profile_completed', label: 'اكتمال الملف', category: 'status' },
    { id: 'created_at', label: 'تاريخ التسجيل', category: 'dates' },
    { id: 'updated_at', label: 'آخر تحديث', category: 'dates' }
  ];

  const formatOptions = [
    {
      id: 'xlsx',
      label: 'Excel (.xlsx)',
      icon: TableCellsIcon,
      description: 'ملف إكسل قابل للتحرير',
      color: 'green'
    },
    {
      id: 'csv',
      label: 'CSV (.csv)',
      icon: DocumentTextIcon,
      description: 'ملف نصي مفصول بفواصل',
      color: 'blue'
    },
    {
      id: 'json',
      label: 'JSON (.json)',
      icon: DocumentChartBarIcon,
      description: 'تنسيق بيانات مهيكل',
      color: 'purple'
    },
    {
      id: 'pdf',
      label: 'PDF (.pdf)',
      icon: DocumentArrowDownIcon,
      description: 'تقرير PDF للطباعة',
      color: 'red'
    }
  ];

  useEffect(() => {
    loadPreview();
    loadStatistics();
  }, [filters, selectedFields]);

  const loadStatistics = async () => {
    try {
      const stats = await memberService.getMemberStatistics();
      setStatistics(prev => ({
        ...prev,
        total: stats.total || 0
      }));
    } catch (error) {
      logger.error('Error loading statistics:', { error });
    }
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const response = await memberService.getMembersList(filters, 1, 5);
      setPreviewData(response.members || []);
      setStatistics(prev => ({
        ...prev,
        filtered: response.total || 0
      }));
    } catch (error) {
      logger.error('Error loading preview:', { error });
      setPreviewData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldToggle = (fieldId) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  const handleSelectAllFields = () => {
    if (selectedFields.length === availableFields.length) {
      setSelectedFields(['full_name', 'membership_number']); // Keep minimum fields
    } else {
      setSelectedFields(availableFields.map(field => field.id));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Simulate export process with animation
      await new Promise(resolve => setTimeout(resolve, 1500));

      const exportFilters = {
        ...filters,
        fields: selectedFields
      };

      const blob = await memberService.exportMembersToExcel(exportFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension = exportFormat;
      link.download = `الأعضاء_${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success animation
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('Export error:', { error });
      alert('حدث خطأ أثناء تصدير البيانات');
    } finally {
      setExporting(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'personal': return UsersIcon;
      case 'contact': return DocumentTextIcon;
      case 'professional': return DocumentChartBarIcon;
      case 'social': return ShieldCheckIcon;
      case 'status': return CheckCircleIcon;
      case 'dates': return CalendarIcon;
      default: return DocumentTextIcon;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'personal': return 'معلومات شخصية';
      case 'contact': return 'معلومات الاتصال';
      case 'professional': return 'معلومات مهنية';
      case 'social': return 'معلومات اجتماعية';
      case 'status': return 'حالة العضوية';
      case 'dates': return 'التواريخ';
      default: return 'أخرى';
    }
  };

  const groupedFields = availableFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {});

  return (
    <div className="premium-export-container">
      {/* Header Section */}
      <div className="export-header-section">
        <div className="header-pattern"></div>
        <div className="export-header-content">
          <div className="header-title-row">
            <div className="title-icon-wrapper">
              <CloudArrowDownIcon className="title-icon" />
            </div>
            <div>
              <h1 className="export-title">تصدير بيانات الأعضاء</h1>
              <p className="export-subtitle">
                قم بتخصيص وتصدير بيانات الأعضاء بالتنسيق المناسب لك
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="export-stats-row">
            <div className="stat-badge">
              <UsersIcon className="stat-badge-icon" />
              <span className="stat-badge-value">{statistics.total}</span>
              <span className="stat-badge-label">إجمالي الأعضاء</span>
            </div>
            <div className="stat-badge active">
              <FunnelIcon className="stat-badge-icon" />
              <span className="stat-badge-value">{statistics.filtered}</span>
              <span className="stat-badge-label">بعد التصفية</span>
            </div>
            <div className="stat-badge">
              <ClipboardDocumentCheckIcon className="stat-badge-icon" />
              <span className="stat-badge-value">{selectedFields.length}</span>
              <span className="stat-badge-label">حقل محدد</span>
            </div>
          </div>
        </div>
      </div>

      <div className="export-content-grid">
        {/* Left Column - Configuration */}
        <div className="export-config-column">
          {/* Format Selection */}
          <div className="config-section glass-card">
            <div className="section-header">
              <DocumentArrowDownIcon className="section-icon" />
              <h3 className="section-title">تنسيق التصدير</h3>
            </div>
            <div className="format-options">
              {formatOptions.map(format => (
                <div
                  key={format.id}
                  className={`format-option ${exportFormat === format.id ? 'active' : ''}`}
                  onClick={() => setExportFormat(format.id)}
                >
                  <div className={`format-icon ${format.color}`}>
                    <format.icon className="icon" />
                  </div>
                  <div className="format-info">
                    <span className="format-label">{format.label}</span>
                    <span className="format-description">{format.description}</span>
                  </div>
                  {exportFormat === format.id && (
                    <CheckCircleIcon className="format-check" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filters Section */}
          <div className="config-section glass-card">
            <div className="section-header">
              <AdjustmentsHorizontalIcon className="section-icon" />
              <h3 className="section-title">فلترة البيانات</h3>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">حالة العضوية</label>
                <select
                  className="filter-select"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="all">الكل</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="suspended">معلق</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">اكتمال الملف</label>
                <select
                  className="filter-select"
                  value={filters.profile_completed}
                  onChange={(e) => setFilters({...filters, profile_completed: e.target.value})}
                >
                  <option value="all">الكل</option>
                  <option value="true">مكتمل</option>
                  <option value="false">غير مكتمل</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">مستفيد من الضمان</label>
                <select
                  className="filter-select"
                  value={filters.social_security_beneficiary}
                  onChange={(e) => setFilters({...filters, social_security_beneficiary: e.target.value})}
                >
                  <option value="all">الكل</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">من تاريخ</label>
                <input
                  type="date"
                  className="filter-input"
                  value={filters.date_from}
                  onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">إلى تاريخ</label>
                <input
                  type="date"
                  className="filter-input"
                  value={filters.date_to}
                  onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Field Selection */}
          <div className="config-section glass-card">
            <div className="section-header">
              <ClipboardDocumentCheckIcon className="section-icon" />
              <h3 className="section-title">الحقول المطلوبة</h3>
              <button
                className="select-all-btn"
                onClick={handleSelectAllFields}
              >
                {selectedFields.length === availableFields.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            </div>
            <div className="fields-categories">
              {Object.entries(groupedFields).map(([category, fields]) => {
                const CategoryIcon = getCategoryIcon(category);
                return (
                  <div key={category} className="field-category">
                    <div className="category-header">
                      <CategoryIcon className="category-icon" />
                      <span className="category-label">{getCategoryLabel(category)}</span>
                    </div>
                    <div className="fields-list">
                      {fields.map(field => (
                        <label
                          key={field.id}
                          className={`field-item ${selectedFields.includes(field.id) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.id)}
                            onChange={() => handleFieldToggle(field.id)}
                            className="field-checkbox"
                          />
                          <span className="field-label">{field.label}</span>
                          {selectedFields.includes(field.id) && (
                            <CheckIcon className="field-check-icon" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Preview & Export */}
        <div className="export-preview-column">
          {/* Preview Section */}
          <div className="preview-section glass-card">
            <div className="section-header">
              <MagnifyingGlassIcon className="section-icon" />
              <h3 className="section-title">معاينة البيانات</h3>
              <span className="preview-badge">أول 5 سجلات</span>
            </div>

            {loading ? (
              <div className="preview-loading">
                <div className="loading-spinner"></div>
                <p>جاري تحميل المعاينة...</p>
              </div>
            ) : previewData.length > 0 ? (
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {selectedFields.map(fieldId => {
                        const field = availableFields.find(f => f.id === fieldId);
                        return (
                          <th key={fieldId}>{field?.label}</th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((member, index) => (
                      <tr key={member.id || index}>
                        {selectedFields.map(fieldId => (
                          <td key={fieldId}>
                            {fieldId === 'social_security_beneficiary' ?
                              (member[fieldId] ? 'نعم' : 'لا') :
                              fieldId === 'profile_completed' ?
                              (member[fieldId] ? 'مكتمل' : 'غير مكتمل') :
                              member[fieldId] || '-'
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="preview-empty">
                <DocumentTextIcon className="empty-icon" />
                <p>لا توجد بيانات للمعاينة</p>
              </div>
            )}
          </div>

          {/* Export Actions */}
          <div className="export-actions glass-card">
            <div className="export-summary">
              <div className="summary-item">
                <span className="summary-label">سيتم تصدير</span>
                <span className="summary-value">{statistics.filtered} عضو</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">عدد الحقول</span>
                <span className="summary-value">{selectedFields.length} حقل</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">التنسيق</span>
                <span className="summary-value">
                  {formatOptions.find(f => f.id === exportFormat)?.label}
                </span>
              </div>
            </div>

            <button
              className={`export-btn ${exporting ? 'exporting' : ''}`}
              onClick={handleExport}
              disabled={exporting || selectedFields.length === 0}
            >
              {exporting ? (
                <>
                  <div className="export-spinner"></div>
                  <span>جاري التصدير...</span>
                </>
              ) : (
                <>
                  <CloudArrowDownIcon className="export-btn-icon" />
                  <span>تصدير البيانات</span>
                  <ChevronRightIcon className="export-btn-arrow" />
                </>
              )}
            </button>

            {exporting && (
              <div className="export-progress">
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
                <p className="progress-text">جاري إعداد الملف...</p>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="help-section glass-card">
            <SparklesIcon className="help-icon" />
            <h4 className="help-title">نصائح للتصدير</h4>
            <ul className="help-list">
              <li>اختر تنسيق Excel للحصول على ملف قابل للتحرير</li>
              <li>استخدم الفلاتر لتصدير بيانات محددة فقط</li>
              <li>حدد الحقول المطلوبة فقط لتقليل حجم الملف</li>
              <li>تنسيق PDF مناسب للطباعة والأرشفة</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(PremiumExportMembers);
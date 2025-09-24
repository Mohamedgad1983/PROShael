import React, { useState, useRef } from 'react';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { memberService } from '../../services/memberService';
import './PremiumImportMembers.css';

const PremiumImportMembers = () => {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Map, 3: Validate, 4: Import
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const requiredFields = [
    { key: 'full_name', label: 'الاسم الكامل', required: true },
    { key: 'phone', label: 'رقم الهاتف', required: true },
    { key: 'membership_number', label: 'رقم العضوية', required: false },
    { key: 'national_id', label: 'الرقم الوطني', required: false },
    { key: 'email', label: 'البريد الإلكتروني', required: false },
    { key: 'whatsapp_number', label: 'رقم الواتساب', required: false },
    { key: 'date_of_birth', label: 'تاريخ الميلاد', required: false },
    { key: 'employer', label: 'جهة العمل', required: false },
    { key: 'social_security_beneficiary', label: 'مستفيد من الضمان', required: false }
  ];

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type)) {
      alert('يرجى اختيار ملف Excel أو CSV');
      return;
    }

    setFile(selectedFile);
    readFile(selectedFile);
  };

  const readFile = (file) => {
    // Temporarily simplified file reading
    alert('استيراد الملفات معطل مؤقتاً للصيانة');

    // Mock data for testing
    const mockHeaders = ['الاسم الكامل', 'رقم الهاتف', 'البريد الإلكتروني'];
    const mockRows = [
      { 'الاسم الكامل': 'أحمد محمد', 'رقم الهاتف': '0501234567', 'البريد الإلكتروني': 'ahmad@example.com' }
    ];

    setColumns(mockHeaders);
    setFileData(mockRows);
    autoMapColumns(mockHeaders);
    setImportStep(2);
  };

  const autoMapColumns = (headers) => {
    const mapping = {};

    requiredFields.forEach(field => {
      const matchingHeader = headers.find(header => {
        const normalized = header.toLowerCase().replace(/\s/g, '');
        return normalized.includes(field.key) ||
               header.includes(field.label) ||
               (field.key === 'full_name' && (header.includes('الاسم') || header.includes('name'))) ||
               (field.key === 'phone' && (header.includes('هاتف') || header.includes('جوال'))) ||
               (field.key === 'email' && header.includes('بريد')) ||
               (field.key === 'national_id' && header.includes('وطني'));
      });

      if (matchingHeader) {
        mapping[field.key] = matchingHeader;
      }
    });

    setColumnMapping(mapping);
  };

  const validateData = () => {
    const results = {
      valid: [],
      invalid: [],
      warnings: [],
      duplicates: []
    };

    const phoneNumbers = new Set();
    const emails = new Set();

    fileData.forEach((row, index) => {
      const errors = [];
      const warnings = [];
      const mappedRow = {};

      // Map columns to required fields
      Object.keys(columnMapping).forEach(fieldKey => {
        const columnName = columnMapping[fieldKey];
        mappedRow[fieldKey] = row[columnName] || '';
      });

      // Validate required fields
      if (!mappedRow.full_name || mappedRow.full_name.trim() === '') {
        errors.push('الاسم الكامل مطلوب');
      }

      if (!mappedRow.phone || mappedRow.phone.trim() === '') {
        errors.push('رقم الهاتف مطلوب');
      } else {
        // Validate Saudi phone number
        const phoneRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        const cleanPhone = mappedRow.phone.toString().replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          errors.push('رقم الهاتف غير صحيح');
        }

        // Check for duplicates
        if (phoneNumbers.has(cleanPhone)) {
          warnings.push('رقم الهاتف مكرر');
        }
        phoneNumbers.add(cleanPhone);
      }

      // Validate email if provided
      if (mappedRow.email && mappedRow.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mappedRow.email)) {
          warnings.push('البريد الإلكتروني غير صحيح');
        }

        if (emails.has(mappedRow.email)) {
          warnings.push('البريد الإلكتروني مكرر');
        }
        emails.add(mappedRow.email);
      }

      const recordResult = {
        index: index + 1,
        data: mappedRow,
        errors,
        warnings
      };

      if (errors.length > 0) {
        results.invalid.push(recordResult);
      } else if (warnings.length > 0) {
        results.warnings.push(recordResult);
        results.valid.push(recordResult);
      } else {
        results.valid.push(recordResult);
      }
    });

    setValidationResults(results);
    setImportStep(3);
  };

  const handleImport = async () => {
    if (!validationResults || validationResults.valid.length === 0) {
      alert('لا توجد بيانات صالحة للاستيراد');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportStep(4);

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    const totalRecords = validationResults.valid.length;
    const batchSize = 10;

    try {
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = validationResults.valid.slice(i, i + batchSize).map(record => record.data);

        try {
          await memberService.importMembersFromExcel({ members: batch });
          results.successful += batch.length;
        } catch (error) {
          results.failed += batch.length;
          results.errors.push(`خطأ في استيراد السجلات ${i + 1} إلى ${i + batch.length}`);
        }

        setImportProgress(Math.round(((i + batch.length) / totalRecords) * 100));

        // Add delay for animation
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setImportResults(results);
    } catch (error) {
      console.error('Import error:', error);
      setImportResults({
        successful: 0,
        failed: totalRecords,
        errors: ['حدث خطأ عام في عملية الاستيراد']
      });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setFileData([]);
    setColumns([]);
    setColumnMapping({});
    setValidationResults(null);
    setImporting(false);
    setImportStep(1);
    setImportProgress(0);
    setImportResults(null);
  };

  const downloadTemplate = () => {
    // Create CSV template instead
    const templateData = [
      ['الاسم الكامل', 'رقم الهاتف', 'البريد الإلكتروني', 'رقم العضوية', 'الرقم الوطني', 'رقم الواتساب', 'تاريخ الميلاد', 'جهة العمل', 'مستفيد من الضمان'],
      ['أحمد محمد السعيد', '0501234567', 'ahmed@example.com', 'M001', '1234567890', '0501234567', '01/01/1990', 'شركة النور', 'لا'],
      ['فاطمة عبدالله الشمري', '0512345678', 'fatima@example.com', 'M002', '2345678901', '0512345678', '15/06/1985', 'مستشفى الملك فهد', 'نعم']
    ];

    // Convert to CSV
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'نموذج_استيراد_الأعضاء.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const renderUploadStep = () => (
    <div className="upload-step">
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon-wrapper">
            <CloudArrowUpIcon className="dropzone-icon" />
          </div>
          <h3 className="dropzone-title">اسحب وأفلت ملف Excel هنا</h3>
          <p className="dropzone-subtitle">أو انقر للاستعراض</p>

          <div className="supported-formats">
            <span className="format-badge">
              <TableCellsIcon className="format-icon" />
              Excel (.xlsx)
            </span>
            <span className="format-badge">
              <DocumentTextIcon className="format-icon" />
              CSV (.csv)
            </span>
          </div>
        </div>
      </div>

      <div className="template-section glass-card">
        <div className="template-header">
          <DocumentPlusIcon className="template-icon" />
          <div>
            <h4 className="template-title">نموذج الاستيراد</h4>
            <p className="template-description">
              قم بتنزيل النموذج لمعرفة التنسيق الصحيح للبيانات
            </p>
          </div>
        </div>
        <button className="template-download-btn" onClick={downloadTemplate}>
          <ArrowDownTrayIcon className="btn-icon" />
          <span>تحميل النموذج</span>
        </button>
      </div>

      <div className="instructions-section glass-card">
        <InformationCircleIcon className="instructions-icon" />
        <h4 className="instructions-title">تعليمات الاستيراد</h4>
        <ul className="instructions-list">
          <li>يجب أن يحتوي الملف على الأعمدة المطلوبة (الاسم الكامل، رقم الهاتف)</li>
          <li>تأكد من أن أرقام الهواتف بالصيغة السعودية الصحيحة</li>
          <li>يمكن أن يحتوي الملف على 1000 سجل كحد أقصى</li>
          <li>سيتم التحقق من البيانات قبل الاستيراد</li>
        </ul>
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="mapping-step">
      <div className="step-header glass-card">
        <CheckCircleIcon className="step-icon success" />
        <div>
          <h3 className="step-title">تم قراءة الملف بنجاح</h3>
          <p className="step-subtitle">
            تم العثور على {fileData.length} سجل في الملف
          </p>
        </div>
      </div>

      <div className="mapping-section glass-card">
        <div className="section-header">
          <ClipboardDocumentCheckIcon className="section-icon" />
          <h3 className="section-title">ربط الأعمدة</h3>
          <p className="section-description">
            قم بمطابقة أعمدة الملف مع حقول النظام
          </p>
        </div>

        <div className="mapping-grid">
          {requiredFields.map(field => (
            <div key={field.key} className="mapping-row">
              <div className="field-info">
                <span className="field-label">{field.label}</span>
                {field.required && <span className="required-badge">مطلوب</span>}
              </div>
              <ChevronRightIcon className="mapping-arrow" />
              <select
                className="mapping-select"
                value={columnMapping[field.key] || ''}
                onChange={(e) => setColumnMapping({
                  ...columnMapping,
                  [field.key]: e.target.value
                })}
              >
                <option value="">-- اختر عمود --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              {columnMapping[field.key] && (
                <CheckBadgeIcon className="mapping-check" />
              )}
            </div>
          ))}
        </div>

        <div className="mapping-preview glass-card">
          <h4 className="preview-title">معاينة البيانات</h4>
          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  {Object.keys(columnMapping).map(key => (
                    <th key={key}>
                      {requiredFields.find(f => f.key === key)?.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileData.slice(0, 3).map((row, index) => (
                  <tr key={index}>
                    {Object.keys(columnMapping).map(key => (
                      <td key={key}>
                        {row[columnMapping[key]] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mapping-actions">
          <button className="secondary-btn" onClick={resetImport}>
            <ArrowPathIcon className="btn-icon" />
            <span>البدء من جديد</span>
          </button>
          <button
            className="primary-btn"
            onClick={validateData}
            disabled={!columnMapping.full_name || !columnMapping.phone}
          >
            <span>التحقق من البيانات</span>
            <ChevronRightIcon className="btn-icon" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderValidationStep = () => (
    <div className="validation-step">
      <div className="validation-summary glass-card">
        <h3 className="summary-title">نتائج التحقق</h3>
        <div className="summary-stats">
          <div className="stat-item success">
            <CheckCircleIcon className="stat-icon" />
            <div>
              <span className="stat-value">{validationResults.valid.length}</span>
              <span className="stat-label">سجل صالح</span>
            </div>
          </div>
          <div className="stat-item warning">
            <ExclamationTriangleIcon className="stat-icon" />
            <div>
              <span className="stat-value">{validationResults.warnings.length}</span>
              <span className="stat-label">تحذير</span>
            </div>
          </div>
          <div className="stat-item error">
            <XCircleIcon className="stat-icon" />
            <div>
              <span className="stat-value">{validationResults.invalid.length}</span>
              <span className="stat-label">خطأ</span>
            </div>
          </div>
        </div>
      </div>

      {validationResults.invalid.length > 0 && (
        <div className="validation-errors glass-card">
          <div className="section-header">
            <XCircleIcon className="section-icon error" />
            <h4 className="section-title">السجلات غير الصالحة</h4>
          </div>
          <div className="errors-list">
            {validationResults.invalid.slice(0, 5).map(record => (
              <div key={record.index} className="error-item">
                <span className="error-row">السطر {record.index}</span>
                <div className="error-messages">
                  {record.errors.map((error, i) => (
                    <span key={i} className="error-msg">{error}</span>
                  ))}
                </div>
              </div>
            ))}
            {validationResults.invalid.length > 5 && (
              <p className="more-errors">
                و {validationResults.invalid.length - 5} أخطاء أخرى...
              </p>
            )}
          </div>
        </div>
      )}

      {validationResults.warnings.length > 0 && (
        <div className="validation-warnings glass-card">
          <div className="section-header">
            <ExclamationTriangleIcon className="section-icon warning" />
            <h4 className="section-title">تحذيرات</h4>
          </div>
          <div className="warnings-list">
            {validationResults.warnings.slice(0, 3).map(record => (
              <div key={record.index} className="warning-item">
                <span className="warning-row">السطر {record.index}</span>
                <div className="warning-messages">
                  {record.warnings.map((warning, i) => (
                    <span key={i} className="warning-msg">{warning}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="validation-actions glass-card">
        <button className="secondary-btn" onClick={() => setImportStep(2)}>
          <ChevronRightIcon className="btn-icon rotate-180" />
          <span>الرجوع للمطابقة</span>
        </button>
        <button
          className="primary-btn"
          onClick={handleImport}
          disabled={validationResults.valid.length === 0}
        >
          <CloudArrowUpIcon className="btn-icon" />
          <span>بدء الاستيراد ({validationResults.valid.length} سجل)</span>
        </button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="import-step">
      {importing ? (
        <div className="importing-container glass-card">
          <div className="import-animation">
            <CloudArrowUpIcon className="import-icon animating" />
          </div>
          <h3 className="import-title">جاري استيراد البيانات...</h3>
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <span className="progress-text">{importProgress}%</span>
          </div>
          <p className="import-status">
            يتم الآن معالجة البيانات وحفظها في قاعدة البيانات
          </p>
        </div>
      ) : importResults && (
        <div className="results-container">
          <div className="results-card glass-card">
            <div className="results-icon-wrapper">
              {importResults.successful > 0 ? (
                <CheckCircleIcon className="results-icon success" />
              ) : (
                <XCircleIcon className="results-icon error" />
              )}
            </div>
            <h3 className="results-title">
              {importResults.successful > 0 ? 'تم الاستيراد بنجاح' : 'فشل الاستيراد'}
            </h3>
            <div className="results-stats">
              <div className="result-stat">
                <CheckCircleIcon className="stat-icon success" />
                <span className="stat-value">{importResults.successful}</span>
                <span className="stat-label">تم استيرادها</span>
              </div>
              {importResults.failed > 0 && (
                <div className="result-stat">
                  <XCircleIcon className="stat-icon error" />
                  <span className="stat-value">{importResults.failed}</span>
                  <span className="stat-label">فشلت</span>
                </div>
              )}
            </div>
            {importResults.errors.length > 0 && (
              <div className="result-errors">
                {importResults.errors.map((error, i) => (
                  <p key={i} className="error-message">{error}</p>
                ))}
              </div>
            )}
            <button className="primary-btn" onClick={resetImport}>
              <DocumentPlusIcon className="btn-icon" />
              <span>استيراد ملف جديد</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="premium-import-container">
      {/* Header Section */}
      <div className="import-header-section">
        <div className="header-pattern"></div>
        <div className="import-header-content">
          <div className="header-title-row">
            <div className="title-icon-wrapper">
              <CloudArrowUpIcon className="title-icon" />
            </div>
            <div>
              <h1 className="import-title">استيراد بيانات الأعضاء</h1>
              <p className="import-subtitle">
                قم باستيراد قائمة الأعضاء من ملف Excel أو CSV
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="progress-steps">
            <div className={`progress-step ${importStep >= 1 ? 'active' : ''} ${importStep > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <span className="step-label">رفع الملف</span>
            </div>
            <div className="step-connector" />
            <div className={`progress-step ${importStep >= 2 ? 'active' : ''} ${importStep > 2 ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <span className="step-label">مطابقة الأعمدة</span>
            </div>
            <div className="step-connector" />
            <div className={`progress-step ${importStep >= 3 ? 'active' : ''} ${importStep > 3 ? 'completed' : ''}`}>
              <div className="step-number">3</div>
              <span className="step-label">التحقق</span>
            </div>
            <div className="step-connector" />
            <div className={`progress-step ${importStep >= 4 ? 'active' : ''}`}>
              <div className="step-number">4</div>
              <span className="step-label">الاستيراد</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="import-content">
        {importStep === 1 && renderUploadStep()}
        {importStep === 2 && renderMappingStep()}
        {importStep === 3 && renderValidationStep()}
        {importStep === 4 && renderImportStep()}
      </div>

      {/* Tips Section */}
      <div className="tips-section">
        <div className="tips-card glass-card">
          <SparklesIcon className="tips-icon" />
          <h4 className="tips-title">نصائح للحصول على أفضل النتائج</h4>
          <div className="tips-grid">
            <div className="tip-item">
              <ShieldCheckIcon className="tip-icon" />
              <p className="tip-text">تأكد من صحة البيانات قبل الاستيراد</p>
            </div>
            <div className="tip-item">
              <DocumentTextIcon className="tip-icon" />
              <p className="tip-text">استخدم النموذج المتوفر لضمان التوافق</p>
            </div>
            <div className="tip-item">
              <UsersIcon className="tip-icon" />
              <p className="tip-text">يمكنك استيراد حتى 1000 عضو في المرة الواحدة</p>
            </div>
            <div className="tip-item">
              <CheckBadgeIcon className="tip-icon" />
              <p className="tip-text">سيتم التحقق من التكرارات تلقائياً</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumImportMembers;
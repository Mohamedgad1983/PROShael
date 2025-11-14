import React, { memo,  useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

const AdvancedFilterBar = ({ filters, setFilters, onApplyFilters, onClearFilters, onExport }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  // Tribal sections
  const tribalSections = [
    'رشود',
    'الدغيش',
    'رشيد',
    'العيد',
    'الرشيد',
    'الشبيعان',
    'المسعود',
    'عقاب'
  ];

  // Balance filter types
  const balanceFilterTypes = [
    { value: 'all', label: 'جميع الأرصدة' },
    { value: 'comparison', label: 'مقارنة بمبلغ' },
    { value: 'range', label: 'نطاق مبلغ' },
    { value: 'predefined', label: 'فئات محددة' }
  ];

  // Comparison operators
  const comparisonOperators = [
    { value: '>', label: 'أكبر من' },
    { value: '>=', label: 'أكبر من أو يساوي' },
    { value: '<', label: 'أقل من' },
    { value: '<=', label: 'أقل من أو يساوي' },
    { value: '=', label: 'يساوي' }
  ];

  // Predefined categories
  const predefinedCategories = [
    { value: 'compliant', label: 'ملتزمون (≥ 3000)' },
    { value: 'nonCompliant', label: 'غير ملتزمين (< 3000)' },
    { value: 'critical', label: 'حرج (< 0)' },
    { value: 'warning', label: 'تحذير (0 - 2999)' }
  ];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (field, value) => {
    const updatedFilters = { ...localFilters, [field]: value };
    setLocalFilters(updatedFilters);
    setFilters(updatedFilters);
  };

  const handleApply = () => {
    onApplyFilters();
  };

  const handleClear = () => {
    const clearedFilters = {
      memberId: '',
      name: '',
      phone: '',
      tribalSection: '',
      balanceFilterType: 'all',
      comparisonOperator: '>=',
      comparisonAmount: '',
      rangeMin: '',
      rangeMax: '',
      predefinedCategory: ''
    };
    setLocalFilters(clearedFilters);
    setFilters(clearedFilters);
    onClearFilters();
  };

  return (
    <div className="advanced-filter-bar">
      {/* Row 1: Text Filters */}
      <div className="filter-row text-filters">
        <div className="filter-group">
          <label className="filter-label">رقم العضوية</label>
          <div className="input-wrapper">
            <MagnifyingGlassIcon className="input-icon" />
            <input
              type="text"
              placeholder="مثال: SH-10001"
              value={localFilters.memberId}
              onChange={(e) => handleFilterChange('memberId', e.target.value)}
              className="filter-input"
              dir="ltr"
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">الاسم</label>
          <div className="input-wrapper">
            <MagnifyingGlassIcon className="input-icon" />
            <input
              type="text"
              placeholder="البحث بالاسم"
              value={localFilters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">رقم التليفون</label>
          <div className="input-wrapper">
            <MagnifyingGlassIcon className="input-icon" />
            <input
              type="text"
              placeholder="مثال: 0501234567"
              value={localFilters.phone}
              onChange={(e) => handleFilterChange('phone', e.target.value)}
              className="filter-input"
              dir="ltr"
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">الفخذ</label>
          <div className="input-wrapper">
            <FunnelIcon className="input-icon" />
            <select
              value={localFilters.tribalSection}
              onChange={(e) => handleFilterChange('tribalSection', e.target.value)}
              className="filter-select"
            >
              <option value="">جميع الفخوذ</option>
              {tribalSections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 2: Balance Filters */}
      <div className="filter-row balance-filters">
        <div className="filter-group">
          <label className="filter-label">نوع فلتر الرصيد</label>
          <div className="input-wrapper">
            <select
              value={localFilters.balanceFilterType}
              onChange={(e) => handleFilterChange('balanceFilterType', e.target.value)}
              className="filter-select"
            >
              {balanceFilterTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic balance filter inputs based on type */}
        {localFilters.balanceFilterType === 'comparison' && (
          <>
            <div className="filter-group">
              <label className="filter-label">المقارنة</label>
              <div className="input-wrapper">
                <select
                  value={localFilters.comparisonOperator}
                  onChange={(e) => handleFilterChange('comparisonOperator', e.target.value)}
                  className="filter-select"
                >
                  {comparisonOperators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">المبلغ</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  placeholder="0"
                  value={localFilters.comparisonAmount}
                  onChange={(e) => handleFilterChange('comparisonAmount', e.target.value)}
                  className="filter-input"
                  dir="ltr"
                />
                <span className="input-suffix">ر.س</span>
              </div>
            </div>
          </>
        )}

        {localFilters.balanceFilterType === 'range' && (
          <>
            <div className="filter-group">
              <label className="filter-label">من</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  placeholder="0"
                  value={localFilters.rangeMin}
                  onChange={(e) => handleFilterChange('rangeMin', e.target.value)}
                  className="filter-input"
                  dir="ltr"
                />
                <span className="input-suffix">ر.س</span>
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">إلى</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  placeholder="10000"
                  value={localFilters.rangeMax}
                  onChange={(e) => handleFilterChange('rangeMax', e.target.value)}
                  className="filter-input"
                  dir="ltr"
                />
                <span className="input-suffix">ر.س</span>
              </div>
            </div>
          </>
        )}

        {localFilters.balanceFilterType === 'predefined' && (
          <div className="filter-group">
            <label className="filter-label">الفئة</label>
            <div className="input-wrapper">
              <select
                value={localFilters.predefinedCategory}
                onChange={(e) => handleFilterChange('predefinedCategory', e.target.value)}
                className="filter-select"
              >
                <option value="">اختر فئة</option>
                {predefinedCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Action Buttons */}
      <div className="filter-row action-buttons">
        <button
          onClick={handleApply}
          className="filter-action-btn apply"
        >
          <MagnifyingGlassIcon className="btn-icon" />
          تطبيق الفلاتر
        </button>

        <button
          onClick={handleClear}
          className="filter-action-btn clear"
        >
          <XMarkIcon className="btn-icon" />
          مسح الكل
        </button>

        <button
          onClick={onExport}
          className="filter-action-btn export"
        >
          <ArrowDownTrayIcon className="btn-icon" />
          تصدير البيانات
        </button>

        <div className="filter-summary">
          <span className="summary-label">الفلاتر النشطة:</span>
          <span className="summary-count">
            {Object.values(localFilters).filter(v => v && v !== 'all' && v !== '>=').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(AdvancedFilterBar);
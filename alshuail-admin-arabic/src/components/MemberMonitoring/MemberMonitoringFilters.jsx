import React, { memo, useCallback } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const MemberMonitoringFilters = memo(({
  searchMemberId,
  searchName,
  searchPhone,
  selectedTribalSection,
  balanceFilterType,
  balanceComparison,
  balanceComparisonAmount,
  balanceRangeFrom,
  balanceRangeTo,
  balanceCategory,
  showAdvancedFilters,
  onSearchMemberIdChange,
  onSearchNameChange,
  onSearchPhoneChange,
  onTribalSectionChange,
  onBalanceFilterTypeChange,
  onBalanceComparisonChange,
  onBalanceComparisonAmountChange,
  onBalanceRangeFromChange,
  onBalanceRangeToChange,
  onBalanceCategoryChange,
  onToggleAdvancedFilters,
  onClearFilters
}) => {
  const handleClearFilters = useCallback(() => {
    onClearFilters();
  }, [onClearFilters]);

  return (
    <div className="filters-section">
      <div className="filters-header">
        <h2 className="filters-title">
          <FunnelIcon className="w-5 h-5" />
          التصفية والبحث
        </h2>
        <button
          className="advanced-filters-toggle"
          onClick={onToggleAdvancedFilters}
        >
          {showAdvancedFilters ? 'إخفاء الفلاتر المتقدمة' : 'عرض الفلاتر المتقدمة'}
        </button>
      </div>

      <div className="filters-grid">
        {/* Basic Filters */}
        <div className="filter-group">
          <label className="filter-label">رقم العضوية</label>
          <div className="search-input-wrapper">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              className="filter-input"
              placeholder="البحث برقم العضوية"
              value={searchMemberId}
              onChange={(e) => onSearchMemberIdChange(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">اسم العضو</label>
          <div className="search-input-wrapper">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              className="filter-input"
              placeholder="البحث بالاسم"
              value={searchName}
              onChange={(e) => onSearchNameChange(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">رقم الجوال</label>
          <div className="search-input-wrapper">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              className="filter-input"
              placeholder="البحث برقم الجوال"
              value={searchPhone}
              onChange={(e) => onSearchPhoneChange(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">الشعبة</label>
          <select
            className="filter-select"
            value={selectedTribalSection}
            onChange={(e) => onTribalSectionChange(e.target.value)}
          >
            <option value="all">جميع الشعب</option>
            <option value="الشعبة الأولى">الشعبة الأولى</option>
            <option value="الشعبة الثانية">الشعبة الثانية</option>
            <option value="الشعبة الثالثة">الشعبة الثالثة</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="advanced-filters">
          <h3 className="advanced-filters-title">فلاتر الرصيد المالي</h3>

          <div className="balance-filter-type">
            <label className="filter-label">نوع التصفية</label>
            <select
              className="filter-select"
              value={balanceFilterType}
              onChange={(e) => onBalanceFilterTypeChange(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="comparison">مقارنة</option>
              <option value="range">نطاق</option>
              <option value="category">فئة</option>
            </select>
          </div>

          {balanceFilterType === 'comparison' && (
            <div className="comparison-filters">
              <select
                className="filter-select"
                value={balanceComparison}
                onChange={(e) => onBalanceComparisonChange(e.target.value)}
              >
                <option value="greater">أكبر من</option>
                <option value="less">أقل من</option>
                <option value="equal">يساوي</option>
              </select>
              <input
                type="number"
                className="filter-input"
                placeholder="المبلغ"
                value={balanceComparisonAmount}
                onChange={(e) => onBalanceComparisonAmountChange(e.target.value)}
              />
            </div>
          )}

          {balanceFilterType === 'range' && (
            <div className="range-filters">
              <input
                type="number"
                className="filter-input"
                placeholder="من"
                value={balanceRangeFrom}
                onChange={(e) => onBalanceRangeFromChange(e.target.value)}
              />
              <span className="range-separator">-</span>
              <input
                type="number"
                className="filter-input"
                placeholder="إلى"
                value={balanceRangeTo}
                onChange={(e) => onBalanceRangeToChange(e.target.value)}
              />
            </div>
          )}

          {balanceFilterType === 'category' && (
            <select
              className="filter-select"
              value={balanceCategory}
              onChange={(e) => onBalanceCategoryChange(e.target.value)}
            >
              <option value="all">جميع الفئات</option>
              <option value="compliant">ملتزم</option>
              <option value="non-compliant">غير ملتزم</option>
              <option value="critical">حرج</option>
              <option value="excellent">ممتاز</option>
            </select>
          )}

          <button
            className="clear-filters-button"
            onClick={handleClearFilters}
          >
            مسح جميع الفلاتر
          </button>
        </div>
      )}
    </div>
  );
});

MemberMonitoringFilters.displayName = 'MemberMonitoringFilters';

export default MemberMonitoringFilters;
import React, { memo, useCallback } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const MemberMonitoringFilters = memo(({
  searchQuery, // ✅ حقل واحد شامل
  selectedTribalSection,
  balanceFilterType,
  balanceComparison,
  balanceComparisonAmount,
  balanceRangeFrom,
  balanceRangeTo,
  balanceCategory,
  showAdvancedFilters,
  onSearchQueryChange, // ✅ دالة واحدة
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
        {/* ✅ حقل بحث واحد شامل - يبحث في كل شيء */}
        <div className="filter-group unified-search">
          <label className="filter-label">بحث شامل</label>
          <div className="search-input-wrapper search-unified">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              className="filter-input"
              placeholder="ابحث برقم العضوية، الاسم، رقم الجوال، أو الشعبة..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              style={{
                fontSize: '15px',
                padding: '12px 12px 12px 40px',
                borderRadius: '8px',
                border: '2px solid #667eea',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                transition: 'all 0.3s',
              }}
            />
          </div>
          <p className="search-hint" style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '6px',
            fontStyle: 'italic'
          }}>
            💡 يمكنك البحث بأي معلومة: رقم العضوية، اسم العضو، رقم الجوال، أو اسم الشعبة
          </p>
        </div>

        <div className="filter-group">
          <label className="filter-label">تصفية حسب الشعبة</label>
          <select
            className="filter-select"
            value={selectedTribalSection}
            onChange={(e) => onTribalSectionChange(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ddd',
            }}
          >
            <option value="all">جميع الشعب</option>
            <option value="رشود">رشود</option>
            <option value="الشعبان">الشعبان</option>
            <option value="الرشيد">الرشيد</option>
            <option value="العيد">العيد</option>
            <option value="الصويان">الصويان</option>
            <option value="العبدالله">العبدالله</option>
            <option value="السليمان">السليمان</option>
            <option value="النايف">النايف</option>
            <option value="الفهد">الفهد</option>
            <option value="المشاري">المشاري</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="advanced-filters" style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: 'rgba(102, 126, 234, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <h3 className="advanced-filters-title" style={{
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: '#667eea'
          }}>
            فلاتر الرصيد المالي
          </h3>

          <div className="balance-filter-type" style={{ marginBottom: '16px' }}>
            <label className="filter-label">نوع التصفية</label>
            <select
              className="filter-select"
              value={balanceFilterType}
              onChange={(e) => onBalanceFilterTypeChange(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                width: '100%'
              }}
            >
              <option value="all">الكل</option>
              <option value="comparison">مقارنة (أكبر من / أقل من)</option>
              <option value="range">نطاق (من - إلى)</option>
              <option value="category">حسب الفئة (ملتزم / غير ملتزم)</option>
            </select>
          </div>

          {balanceFilterType === 'comparison' && (
            <div className="comparison-filters" style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              <select
                className="filter-select"
                value={balanceComparison}
                onChange={(e) => onBalanceComparisonChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              >
                <option value="greater">أكبر من</option>
                <option value="less">أقل من</option>
                <option value="equal">يساوي</option>
              </select>
              <input
                type="number"
                className="filter-input"
                placeholder="المبلغ بالريال"
                value={balanceComparisonAmount}
                onChange={(e) => onBalanceComparisonAmountChange(e.target.value)}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              />
            </div>
          )}

          {balanceFilterType === 'range' && (
            <div className="range-filters" style={{ 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center',
              marginBottom: '16px' 
            }}>
              <input
                type="number"
                className="filter-input"
                placeholder="من (مثال: 0)"
                value={balanceRangeFrom}
                onChange={(e) => onBalanceRangeFromChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              />
              <span className="range-separator" style={{ 
                fontWeight: 'bold',
                fontSize: '18px'
              }}>-</span>
              <input
                type="number"
                className="filter-input"
                placeholder="إلى (مثال: 3000)"
                value={balanceRangeTo}
                onChange={(e) => onBalanceRangeToChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              />
            </div>
          )}

          {balanceFilterType === 'category' && (
            <div style={{ marginBottom: '16px' }}>
              <select
                className="filter-select"
                value={balanceCategory}
                onChange={(e) => onBalanceCategoryChange(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  width: '100%'
                }}
              >
                <option value="all">جميع الفئات</option>
                <option value="compliant">✅ ملتزم (رصيد 2500+ ريال)</option>
                <option value="non-compliant">⚠️ غير ملتزم (رصيد 2000-2500 ريال)</option>
                <option value="critical">🚨 حرج (رصيد أقل من 2000 ريال)</option>
                <option value="excellent">⭐ ممتاز (رصيد 3000+ ريال)</option>
              </select>
            </div>
          )}

          <button
            className="clear-filters-button"
            onClick={handleClearFilters}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
          >
            🗑️ مسح جميع الفلاتر
          </button>
        </div>
      )}
    </div>
  );
});

MemberMonitoringFilters.displayName = 'MemberMonitoringFilters';

export default MemberMonitoringFilters;

# 📅 Hijri Date Integration Guide - Complete Implementation

## ✅ Components Completed with Hijri Integration

### 1. **Hijri Date System Core** ✅
- **File**: `src/utils/hijriDateSystem.ts`
- **Features**:
  - Complete Hijri-Gregorian conversion
  - Multiple date formats (full, long, medium, short, relative)
  - Islamic occasions detection
  - Hijri age calculation
  - Prayer times integration
  - Date range filtering

### 2. **Universal Hijri Date Display Component** ✅
- **File**: `src/components/Common/HijriDateDisplay.tsx`
- **Components**:
  - `HijriDateDisplay` - Main date display component
  - `HijriDateRange` - Date range picker
  - `HijriCalendarWidget` - Full calendar widget
  - `HijriDateFilter` - Quick filter buttons

### 3. **Initiatives Management** ✅
- **File**: `src/components/Initiatives/HijriInitiativesManagement.tsx`
- **Implementation**:
  ```tsx
  // Display start and end dates with Hijri
  <HijriDateDisplay
    date={initiative.startDate}
    format="long"
    showBoth={true}
  />

  // Show relative time for last update
  <HijriDateDisplay
    date={initiative.updatedAt}
    format="relative"
  />
  ```

### 4. **Members Management** ✅
- **File**: `src/components/Members/HijriMembersManagement.tsx`
- **Implementation**:
  ```tsx
  // Birth date with Hijri age calculation
  <HijriDateDisplay date={member.birthDate} />
  <p>العمر: {calculateHijriAge(member.birthDate)} سنة هجرية</p>

  // Join date and last payment
  <HijriDateDisplay date={member.joinDate} format="medium" />
  ```

## 🔄 How to Apply Hijri Dates to Remaining Components

### For Subscriptions Component:
```tsx
import { HijriDateDisplay, HijriDateFilter } from '../Common/HijriDateDisplay';
import { formatHijriDate, formatDualDate } from '../../utils/hijriDateUtils';

// In your component:
<div className="subscription-dates">
  {/* Subscription start date */}
  <div className="date-field">
    <label>تاريخ بداية الاشتراك</label>
    <HijriDateDisplay
      date={subscription.startDate}
      format="long"
      showBoth={true}
      highlightToday={true}
    />
  </div>

  {/* Next payment date */}
  <div className="date-field">
    <label>تاريخ الدفعة القادمة</label>
    <HijriDateDisplay
      date={subscription.nextPaymentDate}
      format="medium"
      showBoth={true}
    />
  </div>

  {/* Last payment */}
  <div className="date-field">
    <label>آخر دفعة</label>
    <HijriDateDisplay
      date={subscription.lastPaymentDate}
      format="relative"
    />
  </div>
</div>

// Add date filter
<HijriDateFilter
  onFilterChange={(filter) => {
    // Filter subscriptions by date range
    filterSubscriptionsByDate(filter.start, filter.end);
  }}
/>
```

### For Diyas Component:
```tsx
// Display case creation date
<HijriDateDisplay
  date={diya.createdDate}
  format="full"
  showBoth={true}
/>

// Show payment deadline with warning
<div className={isOverdue(diya.deadline) ? 'text-red-600' : ''}>
  <HijriDateDisplay
    date={diya.deadline}
    format="long"
    showBoth={true}
    highlightToday={isToday(diya.deadline)}
  />
  {isOverdue(diya.deadline) && <span>متأخر!</span>}
</div>

// Payment history with Hijri dates
{diya.payments.map(payment => (
  <div key={payment.id} className="payment-entry">
    <HijriDateDisplay
      date={payment.date}
      format="short"
    />
    <span>{payment.amount} ريال</span>
  </div>
))}
```

### For Reports Component:
```tsx
// Date range selector for reports
<div className="report-date-range">
  <HijriDateRange
    startDate={reportStartDate}
    endDate={reportEndDate}
    onChange={(start, end) => {
      generateReport(start, end);
    }}
  />
</div>

// Display report generation date
<div className="report-header">
  <p>تاريخ إنشاء التقرير:</p>
  <HijriDateDisplay
    date={new Date()}
    format="full"
    showBoth={true}
  />
</div>

// Monthly reports with Hijri months
{hijriMonths.map(month => (
  <div key={month.id} className="month-report">
    <h3>{month.monthName} {month.year} هـ</h3>
    <p>الإيرادات: {month.revenue} ريال</p>
    <p>المصروفات: {month.expenses} ريال</p>
  </div>
))}
```

### For Payments Component:
```tsx
// Payment date with dual display
<HijriDateDisplay
  date={payment.date}
  format="long"
  showBoth={true}
/>

// Due date with status indicator
<div className="due-date">
  <HijriDateDisplay
    date={payment.dueDate}
    format="medium"
    showBoth={true}
    highlightToday={true}
  />
  {getDaysUntil(payment.dueDate) < 3 && (
    <span className="text-orange-500">قريباً!</span>
  )}
</div>

// Payment history timeline
<div className="payment-timeline">
  {payments.map((payment, index) => (
    <div key={payment.id} className="timeline-item">
      <div className="timeline-date">
        <HijriDateDisplay
          date={payment.date}
          format={index === 0 ? 'full' : 'medium'}
          showBoth={true}
        />
      </div>
      <div className="timeline-content">
        {payment.description}
      </div>
    </div>
  ))}
</div>
```

### For Events/Occasions Component:
```tsx
// Event date with full formatting
<HijriDateDisplay
  date={event.date}
  format="full"
  showBoth={true}
  highlightToday={isToday(event.date)}
/>

// Check for Islamic occasions
{getIslamicOccasion(event.date) && (
  <div className="islamic-occasion-badge">
    {getIslamicOccasion(event.date).nameAr}
  </div>
)}

// RSVP deadline
<div className="rsvp-deadline">
  <span>آخر موعد للتأكيد:</span>
  <HijriDateDisplay
    date={event.rsvpDeadline}
    format="relative"
  />
</div>
```

## 🎨 Styling Classes for Hijri Dates

```css
/* Hijri date container */
.hijri-date-display {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(229, 231, 235, 0.5);
  transition: all 0.3s ease;
}

/* Today's date highlight */
.hijri-date-today {
  background: linear-gradient(135deg, rgba(0, 168, 107, 0.1), rgba(88, 86, 214, 0.1));
  border-color: rgba(0, 168, 107, 0.3);
}

/* Overdue date */
.hijri-date-overdue {
  background: rgba(255, 59, 48, 0.1);
  border-color: rgba(255, 59, 48, 0.3);
  color: #FF3B30;
}

/* Upcoming date */
.hijri-date-upcoming {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);
}

/* Islamic occasion */
.hijri-date-occasion {
  background: linear-gradient(135deg, #FFD700, #F59E0B);
  color: white;
  font-weight: 600;
}
```

## 📝 Search and Filter Implementation

### Search by Hijri Date:
```tsx
// Add Hijri date search
const searchByHijriDate = (query: string) => {
  const hijriDate = parseHijriDate(query);
  if (hijriDate) {
    const gregorianDate = hijriToGregorian(
      hijriDate.year,
      hijriDate.month,
      hijriDate.day
    );

    return items.filter(item =>
      isSameDay(new Date(item.date), gregorianDate)
    );
  }
  return [];
};

// Search input with Hijri support
<input
  type="text"
  placeholder="ابحث بالتاريخ الهجري (مثال: 15 رمضان 1445)"
  onChange={(e) => {
    const results = searchByHijriDate(e.target.value);
    setFilteredItems(results);
  }}
/>
```

### Quick Date Filters:
```tsx
const dateFilters = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر الهجري' },
  { id: 'year', label: 'هذه السنة الهجرية' },
  { id: 'ramadan', label: 'شهر رمضان' },
  { id: 'occasions', label: 'المناسبات الإسلامية' }
];

// Apply filter
const applyDateFilter = (filterId: string) => {
  const range = getHijriDateRange(filterId);
  filterItemsByDateRange(range.start, range.end);
};
```

## 🔍 Best Practices

1. **Always show both dates**: Display both Hijri and Gregorian dates for clarity
2. **Use relative dates**: For recent activities, use relative format ("منذ 3 أيام")
3. **Highlight important dates**: Today, overdue, and Islamic occasions
4. **Consistent formatting**: Use the same format across similar contexts
5. **Tooltips**: Add tooltips showing the alternate calendar on hover
6. **Validation**: Validate Hijri dates before saving
7. **Sorting**: Allow sorting by both Hijri and Gregorian dates

## 🚀 Quick Implementation Steps

1. **Import the components**:
```tsx
import { HijriDateDisplay, HijriDateFilter, HijriCalendarWidget } from '../Common/HijriDateDisplay';
import { formatHijriDate, formatDualDate, calculateHijriAge } from '../../utils/hijriDateUtils';
```

2. **Replace date displays**:
```tsx
// Before:
<span>{new Date(date).toLocaleDateString()}</span>

// After:
<HijriDateDisplay date={date} format="long" showBoth={true} />
```

3. **Add date filters**:
```tsx
<HijriDateFilter onFilterChange={handleDateFilter} />
```

4. **Use in forms**:
```tsx
<div className="form-field">
  <label>تاريخ البداية</label>
  <input type="date" onChange={(e) => {
    const hijriDate = gregorianToHijri(new Date(e.target.value));
    setHijriDateLabel(hijriDate.formatted);
  }} />
  <span className="hijri-label">{hijriDateLabel}</span>
</div>
```

## 📊 Performance Optimization

- Cache Hijri conversions for frequently accessed dates
- Use memoization for date formatting functions
- Lazy load calendar widget component
- Batch date conversions when displaying lists

## 🎯 Testing Checklist

- [ ] All dates display correctly in both calendars
- [ ] Date filters work with Hijri ranges
- [ ] Search by Hijri date returns correct results
- [ ] Islamic occasions are highlighted
- [ ] Age calculations are accurate
- [ ] Relative dates update correctly
- [ ] Date sorting works properly
- [ ] Form validation handles Hijri dates
- [ ] Export includes both date formats
- [ ] Mobile responsive date displays

## 🌟 Advanced Features

1. **Hijri Month View**: Calendar showing full Hijri month
2. **Prayer Times Integration**: Show prayer times with events
3. **Islamic Holidays**: Auto-detect and highlight
4. **Lunar Phases**: Display moon phases for religious events
5. **Custom Date Formats**: User preference for date display
6. **Hijri Year Navigation**: Jump to specific Hijri years
7. **Date Conversion Tool**: Standalone conversion utility
8. **Historical Events**: Show significant Islamic dates

---

**Implementation Status**:
- ✅ Core System
- ✅ Display Components
- ✅ Initiatives
- ✅ Members
- 🔄 Subscriptions (Ready to implement)
- 🔄 Diyas (Ready to implement)
- 🔄 Reports (Ready to implement)
- 🔄 Payments (Ready to implement)
- 🔄 Events (Ready to implement)

Use this guide to quickly implement Hijri dates across all remaining components!
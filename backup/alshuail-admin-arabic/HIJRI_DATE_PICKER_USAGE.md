# 📅 Hijri Date Picker Usage Guide

## ✨ What's New
I've created a **custom Hijri Date Picker component** that shows and accepts Hijri dates directly in the input fields, not just Gregorian dates with a Hijri display below.

## 🎯 Key Features
- **Hijri Calendar View**: Shows Hijri months and days
- **Manual Input**: Type dates like "15 رمضان 1446" or "15/9/1446"
- **Live Conversion**: Shows Gregorian equivalent automatically
- **Validation**: Ensures valid Hijri dates
- **Month/Year Navigation**: Easy navigation through Hijri calendar
- **Today Button**: Quick selection of current Hijri date

## 📝 How to Use in Your Modals

### 1. Import the Component
```tsx
import { HijriDatePicker, HijriDateRangePicker } from '../Common/HijriDatePicker';
```

### 2. Replace Standard Date Inputs

#### ❌ OLD WAY (Gregorian Input):
```tsx
<input
  type="date"
  value={eventData.date}
  onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
  className="input-premium w-full"
/>
```

#### ✅ NEW WAY (Hijri Input):
```tsx
<HijriDatePicker
  value={eventData.date}
  onChange={(gregorianDate, hijriDate) => {
    setEventData({ ...eventData, date: gregorianDate });
    // hijriDate is the formatted Hijri string like "15 رمضان 1446"
  }}
  label="تاريخ المناسبة"
  placeholder="اختر التاريخ الهجري"
  required={true}
  showGregorian={true}
/>
```

## 📋 Complete Examples

### For Events/Occasions Modal:
```tsx
const AddEventModal = () => {
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    endDate: '',
    // ... other fields
  });

  return (
    <form>
      {/* Event Title */}
      <input type="text" ... />

      {/* Hijri Date Picker for Start Date */}
      <HijriDatePicker
        value={eventData.date}
        onChange={(gregorianDate, hijriDate) => {
          setEventData({ ...eventData, date: gregorianDate });
          console.log('Selected Hijri date:', hijriDate);
        }}
        label="تاريخ البداية"
        required={true}
      />

      {/* Hijri Date Picker for End Date */}
      <HijriDatePicker
        value={eventData.endDate}
        onChange={(gregorianDate, hijriDate) => {
          setEventData({ ...eventData, endDate: gregorianDate });
        }}
        label="تاريخ النهاية"
        minDate={eventData.date} // Can't be before start date
      />
    </form>
  );
};
```

### For Diyas Modal:
```tsx
const AddDiyaModal = () => {
  const [diyaData, setDiyaData] = useState({
    startDate: '',
    deadline: '',
    // ... other fields
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <HijriDatePicker
        value={diyaData.startDate}
        onChange={(gregorianDate, hijriDate) => {
          setDiyaData({ ...diyaData, startDate: gregorianDate });
        }}
        label="تاريخ البداية"
        required={true}
      />

      <HijriDatePicker
        value={diyaData.deadline}
        onChange={(gregorianDate, hijriDate) => {
          setDiyaData({ ...diyaData, deadline: gregorianDate });
        }}
        label="الموعد النهائي"
        required={true}
        minDate={diyaData.startDate}
      />
    </div>
  );
};
```

### For Date Range Selection:
```tsx
<HijriDateRangePicker
  startValue={filterStartDate}
  endValue={filterEndDate}
  onStartChange={(gregorianDate, hijriDate) => {
    setFilterStartDate(gregorianDate);
  }}
  onEndChange={(gregorianDate, hijriDate) => {
    setFilterEndDate(gregorianDate);
  }}
  startLabel="من تاريخ"
  endLabel="إلى تاريخ"
/>
```

## 🎨 Component Props

### HijriDatePicker Props:
| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `value` | string | Gregorian date (YYYY-MM-DD) | - |
| `onChange` | function | Called with (gregorianDate, hijriDate) | - |
| `label` | string | Field label | - |
| `placeholder` | string | Input placeholder | "اختر التاريخ الهجري" |
| `required` | boolean | Is field required | false |
| `minDate` | string | Minimum selectable date | - |
| `maxDate` | string | Maximum selectable date | - |
| `showGregorian` | boolean | Show Gregorian date below | true |

## 💡 Input Formats Supported

Users can type dates in these formats:
1. **Arabic Text**: `15 رمضان 1446`
2. **Numeric**: `15/9/1446`
3. **Click Calendar**: Select from the visual calendar

## 🔧 Quick Integration Steps

### Step 1: Update your modal component imports
```tsx
import { HijriDatePicker } from '../Common/HijriDatePicker';
```

### Step 2: Replace all date inputs
Replace every `<input type="date">` with `<HijriDatePicker>`

### Step 3: Update state handling
```tsx
// The component returns both dates
onChange={(gregorianDate, hijriDate) => {
  // gregorianDate: "2024-03-15" (for backend)
  // hijriDate: "15 رمضان 1446" (for display)

  // Save gregorianDate to state for backend
  setFormData({ ...formData, date: gregorianDate });

  // Optional: Save hijriDate for display purposes
  setHijriDisplay(hijriDate);
}}
```

## 🌟 Visual Features

### Calendar View:
- **Month Dropdown**: Select from 12 Hijri months
- **Year Input**: Type or select Hijri year
- **Navigation Arrows**: Move between months
- **Day Grid**: Shows Hijri days with Saturday-Friday week
- **Selected Day**: Highlighted with gradient background
- **Today Button**: Quick jump to current Hijri date

### Input Field:
- **Hijri Display**: Shows selected date in Hijri
- **Calendar Icon**: Click to open calendar
- **Validation**: Red border for invalid dates
- **Gregorian Display**: Shows equivalent date below

## 🚀 Implementation Checklist

- [ ] Import HijriDatePicker component
- [ ] Replace date inputs in Add Event modal
- [ ] Replace date inputs in Add Diya modal
- [ ] Replace date inputs in Add Initiative modal
- [ ] Replace date inputs in Add Member modal
- [ ] Replace date inputs in Add Payment modal
- [ ] Test manual input with Arabic text
- [ ] Test calendar selection
- [ ] Test date validation
- [ ] Verify Gregorian conversion

## 📍 Current Implementation Status

✅ **Component Created**: `HijriDatePicker.tsx`
✅ **Utilities Updated**: All Hijri conversion functions added
✅ **Ready to Use**: Component is fully functional

🔄 **Next Steps**:
- Replace date inputs in all modals
- The component is plug-and-play ready
- Just import and use as shown above

## 🎯 Result
When users click on date fields, they will see:
1. **Hijri calendar** with Arabic month names
2. **Hijri days** (1-29/30)
3. **Input shows**: "15 رمضان 1446"
4. **Below shows**: "التاريخ الميلادي: 15/03/2024"

This ensures users work with Hijri dates throughout the application!
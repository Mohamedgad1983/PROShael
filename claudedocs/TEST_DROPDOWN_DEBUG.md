# Dropdown Debug Test Plan

## Issue
Dropdowns show options but selection doesn't "stick" - the selected value doesn't persist in the form.

## Code Analysis

### Current Implementation (Lines 554-587)
```tsx
<select
    value={formData.category}
    onChange={(e) => {
        console.log('Category selected:', e.target.value);
        setFormData({ ...formData, category: e.target.value });
    }}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    required
>
    <option value="">-- اختر التصنيف --</option>
    <option value="general">عام</option>
    <option value="announcement">إعلان</option>
    <option value="urgent">عاجل</option>
    <option value="event">حدث</option>
</select>
```

### Potential Issues

1. **React State Update Not Batching Correctly**
   - Spread operator might not trigger re-render
   - Solution: Use functional setState

2. **Event Handler Being Overridden**
   - Some parent component might be preventing the event
   - Solution: Add e.stopPropagation()

3. **Value Not Being Set Due to Type Mismatch**
   - TypeScript type issue
   - Solution: Explicit type casting

4. **Component Re-rendering Too Fast**
   - Modal might be re-initializing form state
   - Solution: Use useCallback for handlers

## Debugging Steps

### Step 1: Check Console Logs
When you select a dropdown option, you should see:
```
Category selected: general
```

If you DON'T see this, the onChange is not firing at all.

### Step 2: Check formData State
Add this after the console.log:
```tsx
console.log('Current formData:', formData);
```

### Step 3: Check if Modal is Resetting
Add console.log in the modal render:
```tsx
{showCreateModal && (
    console.log('Modal rendering, formData:', formData),
    <div className="fixed...">
```

## Recommended Fixes

### Fix 1: Use Functional setState (Most Likely Fix)
```tsx
onChange={(e) => {
    const value = e.target.value;
    console.log('Category selected:', value);
    setFormData(prev => ({ ...prev, category: value }));
}}
```

### Fix 2: Add Event Propagation Stop
```tsx
onChange={(e) => {
    e.stopPropagation();
    const value = e.target.value;
    console.log('Category selected:', value);
    setFormData(prev => ({ ...prev, category: value }));
}}
```

### Fix 3: Use useCallback for Handlers
```tsx
const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('Category selected:', value);
    setFormData(prev => ({ ...prev, category: value }));
}, []);
```

### Fix 4: Separate State for Dropdowns
```tsx
const [category, setCategory] = useState('');
const [priority, setPriority] = useState('');

// Then in useEffect, update formData
useEffect(() => {
    setFormData(prev => ({ ...prev, category, priority }));
}, [category, priority]);
```

## Browser Console Commands to Test

Open browser console (F12) and type:
```javascript
// Check if formData is accessible
document.querySelector('select').value

// Manually trigger change
const select = document.querySelector('select');
select.value = 'general';
select.dispatchEvent(new Event('change', { bubbles: true }));
```

## Next Steps

1. Apply Fix 1 (functional setState) - most likely to work
2. Test in browser
3. Check console for logs
4. If still not working, apply Fix 2
5. If still not working, investigate parent component

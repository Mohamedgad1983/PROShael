# 🎯 QUICK REFERENCE - Dropdown Fix

**One-Page Guide for Frontend Agent**

---

## 📋 3-STEP FIX

### 1️⃣ CREATE CSS FILE
**File**: `src/styles/SelectFix.css`  
**Content**: Copy from FRONTEND_AGENT_INSTRUCTIONS.md (Step 1)

### 2️⃣ IMPORT CSS
**File**: `NewsManagement.tsx`  
**Add**: `import '../../styles/SelectFix.css';`

### 3️⃣ REPLACE DROPDOWNS
**Find**: Search for `التصنيف` in NewsManagement.tsx  
**Replace**: Use new dropdown code with `dir="rtl"`

---

## 🔑 KEY CHANGES

```tsx
// OLD ❌
<select
    value={formData.category}
    onChange={(e) => handleInputChange('category', e.target.value)}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
    style={{ fontSize: '16px', fontFamily: 'Arial, sans-serif' }}
>

// NEW ✅
<select
    value={formData.category}
    onChange={(e) => {
        console.log('✅ Category changed to:', e.target.value);
        handleInputChange('category', e.target.value);
    }}
    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900"
    dir="rtl"
>
```

---

## ✅ TEST CHECKLIST

- [ ] Dropdowns show Arabic text (not "--")
- [ ] Arrow on LEFT side
- [ ] Console shows debug logs
- [ ] Selected value persists
- [ ] Works in Chrome, Firefox, Safari

---

## 🚨 DON'T FORGET

1. ✅ Add `dir="rtl"` to BOTH Category and Priority selects
2. ✅ Remove inline `style={{ fontFamily: ... }}`
3. ✅ Add `bg-white` class
4. ✅ Add console.log for debugging
5. ✅ Keep existing `handleInputChange` function

---

## ⚡ FAST COMMANDS

```bash
# Restart dev server
npm run dev

# Clear cache if needed
rm -rf node_modules/.cache && npm run dev
```

---

**Time**: 15 minutes | **Priority**: HIGH | **Files**: 2 (CSS + TSX)

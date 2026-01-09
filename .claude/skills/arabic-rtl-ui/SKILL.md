---
name: arabic-rtl-ui
description: Build Arabic and RTL (Right-to-Left) user interfaces with proper typography, layout mirroring, and bilingual support. Use when creating Arabic UIs, RTL layouts, or bilingual Arabic/English applications.
---

# Arabic RTL UI Skill

## Purpose
Create professional Arabic and Right-to-Left (RTL) user interfaces with proper typography, layout mirroring, and seamless bilingual support.

## RTL Fundamentals

### HTML Direction
```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <!-- Content flows right-to-left -->
</body>
</html>
```

### Dynamic Direction (Bilingual)
```tsx
// React with next-intl or similar
function App() {
  const { locale } = useLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  
  return (
    <html lang={locale} dir={dir}>
      <body className={dir === 'rtl' ? 'font-arabic' : 'font-sans'}>
        {children}
      </body>
    </html>
  );
}
```

## Arabic Typography

### Recommended Fonts
```css
/* Arabic Fonts - Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Tajawal:wght@400;500;700&family=Almarai:wght@400;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap');

:root {
  /* Modern, clean Arabic fonts */
  --font-arabic-primary: 'Cairo', 'Segoe UI', sans-serif;
  --font-arabic-secondary: 'Tajawal', sans-serif;
  --font-arabic-display: 'Noto Kufi Arabic', sans-serif;
  
  /* For mixed Arabic/English content */
  --font-bilingual: 'Cairo', 'Inter', sans-serif;
}

/* Arabic text styling */
.arabic-text {
  font-family: var(--font-arabic-primary);
  line-height: 1.8; /* Arabic needs more line height */
  letter-spacing: 0; /* No letter spacing for Arabic */
}
```

### Font Size Adjustments
```css
/* Arabic text often needs slightly larger sizes */
[dir="rtl"] {
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.375rem;    /* 22px */
  --text-2xl: 1.75rem;    /* 28px */
  --text-3xl: 2.25rem;    /* 36px */
}
```

## Tailwind RTL Configuration

### tailwind.config.js
```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
        display: ['Noto Kufi Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'), // RTL plugin
  ],
};
```

### RTL Utilities
```html
<!-- Use logical properties -->
<div class="ps-4 pe-2 ms-auto me-0">
  <!-- ps = padding-start (right in RTL) -->
  <!-- pe = padding-end (left in RTL) -->
  <!-- ms = margin-start -->
  <!-- me = margin-end -->
</div>

<!-- Or use RTL variants -->
<div class="ltr:pl-4 rtl:pr-4 ltr:text-left rtl:text-right">
  <!-- Explicit LTR/RTL overrides -->
</div>
```

## Layout Patterns

### Navigation (RTL)
```tsx
function ArabicNavbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-slate-900" dir="rtl">
      {/* Logo on the right */}
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="الشعار" className="h-10" />
        <span className="text-xl font-bold text-white font-arabic">
          نظام إدارة المطاعم
        </span>
      </div>
      
      {/* Navigation links */}
      <div className="flex items-center gap-6">
        <a href="/dashboard" className="text-slate-300 hover:text-white">
          لوحة التحكم
        </a>
        <a href="/orders" className="text-slate-300 hover:text-white">
          الطلبات
        </a>
        <a href="/menu" className="text-slate-300 hover:text-white">
          القائمة
        </a>
        <a href="/reports" className="text-slate-300 hover:text-white">
          التقارير
        </a>
      </div>
      
      {/* User menu on the left */}
      <div className="flex items-center gap-4">
        <button className="text-slate-300">
          <Bell className="h-5 w-5" />
        </button>
        <Avatar />
      </div>
    </nav>
  );
}
```

### Sidebar (RTL)
```tsx
function ArabicSidebar() {
  return (
    <aside className="w-64 bg-slate-900 border-l border-slate-800" dir="rtl">
      {/* Note: border-l becomes border on the left (visually right in RTL) */}
      <div className="p-4">
        <nav className="space-y-2">
          <SidebarItem icon={<Home />} label="الرئيسية" href="/" />
          <SidebarItem icon={<ShoppingBag />} label="الطلبات" href="/orders" />
          <SidebarItem icon={<Users />} label="العملاء" href="/customers" />
          <SidebarItem icon={<Package />} label="المنتجات" href="/products" />
          <SidebarItem icon={<BarChart />} label="التقارير" href="/reports" />
          <SidebarItem icon={<Settings />} label="الإعدادات" href="/settings" />
        </nav>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, href }) {
  return (
    <a 
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
    >
      {icon}
      <span className="font-arabic">{label}</span>
    </a>
  );
}
```

### Data Table (RTL)
```tsx
function ArabicOrdersTable({ orders }) {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden" dir="rtl">
      <table className="w-full">
        <thead className="bg-slate-900/50">
          <tr>
            <th className="text-right px-4 py-3 text-slate-400 font-arabic">رقم الطلب</th>
            <th className="text-right px-4 py-3 text-slate-400 font-arabic">العميل</th>
            <th className="text-right px-4 py-3 text-slate-400 font-arabic">المبلغ</th>
            <th className="text-right px-4 py-3 text-slate-400 font-arabic">الحالة</th>
            <th className="text-right px-4 py-3 text-slate-400 font-arabic">التاريخ</th>
            <th className="text-right px-4 py-3 text-slate-400 font-arabic">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-slate-800 hover:bg-slate-800/50">
              <td className="px-4 py-3 text-white font-mono">{order.id}</td>
              <td className="px-4 py-3 text-slate-300 font-arabic">{order.customer}</td>
              <td className="px-4 py-3 text-white">{order.amount} د.ك</td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-slate-400" dir="ltr">{order.date}</td>
              <td className="px-4 py-3">
                <button className="text-blue-400 hover:text-blue-300">عرض</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Form (RTL)
```tsx
function ArabicOrderForm() {
  return (
    <form className="space-y-6" dir="rtl">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300 font-arabic">
            اسم العميل
          </label>
          <input 
            type="text"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-arabic placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="أدخل اسم العميل"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300 font-arabic">
            رقم الهاتف
          </label>
          <input 
            type="tel"
            dir="ltr" /* Phone numbers are LTR */
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-left placeholder:text-slate-500 focus:border-blue-500"
            placeholder="+965 XXXX XXXX"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300 font-arabic">
          العنوان
        </label>
        <textarea 
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-arabic placeholder:text-slate-500 focus:border-blue-500 resize-none"
          rows={3}
          placeholder="أدخل عنوان التوصيل"
        />
      </div>
      
      <div className="flex gap-4 justify-start">
        <button 
          type="submit"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-arabic font-medium transition-colors"
        >
          إنشاء الطلب
        </button>
        <button 
          type="button"
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-arabic transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
```

## Status Badges (Arabic)
```tsx
const statusLabels = {
  pending: 'قيد الانتظار',
  processing: 'قيد التحضير',
  ready: 'جاهز',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ready: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-sm border font-arabic ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
```

## Numbers and Dates

### Arabic Numerals (Optional)
```tsx
// Convert to Arabic numerals
function toArabicNumerals(num) {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, d => arabicNumerals[d]);
}

// Format currency (Kuwaiti Dinar)
function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
  }).format(amount);
}

// Format date
function formatDate(date) {
  return new Intl.DateTimeFormat('ar-KW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}
```

## Language Switcher
```tsx
function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  
  return (
    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
      <button
        onClick={() => setLocale('ar')}
        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
          locale === 'ar' 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-400 hover:text-white'
        }`}
      >
        العربية
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
          locale === 'en' 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-400 hover:text-white'
        }`}
      >
        English
      </button>
    </div>
  );
}
```

## Common Arabic UI Terms

| English | Arabic |
|---------|--------|
| Dashboard | لوحة التحكم |
| Orders | الطلبات |
| Customers | العملاء |
| Products | المنتجات |
| Reports | التقارير |
| Settings | الإعدادات |
| Search | بحث |
| Add New | إضافة جديد |
| Edit | تعديل |
| Delete | حذف |
| Save | حفظ |
| Cancel | إلغاء |
| Submit | إرسال |
| Loading | جاري التحميل |
| Error | خطأ |
| Success | نجاح |
| Total | الإجمالي |
| Date | التاريخ |
| Status | الحالة |
| Actions | الإجراءات |

## Instructions

1. **Set document direction**: Use `dir="rtl"` on html or container
2. **Choose Arabic fonts**: Cairo, Tajawal, or Almarai
3. **Use logical properties**: `ps-`, `pe-`, `ms-`, `me-` instead of `pl-`, `pr-`
4. **Mirror icons**: Flip directional icons (arrows, chevrons)
5. **Handle mixed content**: Numbers and English stay LTR
6. **Test thoroughly**: Check all alignments and spacing

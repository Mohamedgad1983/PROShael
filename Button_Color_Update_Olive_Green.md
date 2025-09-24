# تحديث ألوان أزرار محددة: إيقاف و تسجيل الخروج

## الأزرار المطلوب تغييرها فقط:
1. **إيقاف** (Stop/Pause buttons)
2. **تسجيل الخروج** (Logout button)

## تحديث CSS للأزرار المحددة:

### 1. زر "إيقاف" (Stop/Pause Button):
```css
.stop-btn,
.pause-btn,
.btn-stop {
  background: rgba(132, 204, 22, 0.2) !important;
  border: 1px solid rgba(132, 204, 22, 0.4) !important;
  color: #bef264 !important;
  transition: all 0.3s ease;
}

.stop-btn:hover,
.pause-btn:hover,
.btn-stop:hover {
  background: rgba(132, 204, 22, 0.3) !important;
  border-color: rgba(132, 204, 22, 0.6) !important;
  color: white !important;
  transform: translateY(-2px);
}
```

### 2. زر "تسجيل الخروج" (Logout Button):
```css
.logout-btn,
.btn-logout {
  background: rgba(132, 204, 22, 0.15) !important;
  border: 1px solid rgba(132, 204, 22, 0.3) !important;
  color: #bef264 !important;
  transition: all 0.3s ease;
}

.logout-btn:hover,
.btn-logout:hover {
  background: rgba(132, 204, 22, 0.25) !important;
  border-color: rgba(132, 204, 22, 0.5) !important;
  color: white !important;
}
```

## إذا كنت تستخدم Tailwind CSS:
```html
<!-- زر إيقاف -->
<button class="bg-lime-500/20 text-lime-300 border border-lime-400/30 hover:bg-lime-500/30">
  إيقاف
</button>

<!-- زر تسجيل الخروج -->
<button class="bg-lime-500/15 text-lime-300 border border-lime-400/30 hover:bg-lime-500/25">
  تسجيل الخروج
</button>
```

## ألوان محددة للمطور:
- **اللون الأساسي**: `#84cc16` (أخضر زيتوني)
- **النص**: `#bef264` (أخضر فاتح)
- **الخلفية**: `rgba(132, 204, 22, 0.2)` (شفاف 20%)
- **الحدود**: `rgba(132, 204, 22, 0.4)` (شفاف 40%)

**ملاحظة**: باقي الأزرار تبقى بألوانها الحالية، فقط هذين الزرين يتم تغييرهما للون الأخضر الزيتوني الفاتح.

تطبيق هذه التغييرات فقط على الزرين المحددين وستحصل على اللون الأخضر الزيتوني الفاتح المطلوب.

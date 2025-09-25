# نظام الدفع المرن - Flexible Payment System

## نظرة عامة

نظام دفع متطور مصمم خصيصاً لعائلة آل الشعيل، يدعم المبالغ المرنة مع تصميم زجاجي أنيق وتجربة مستخدم سلسة بالعربية.

## المميزات الرئيسية

### 🎨 التصميم
- **Glassmorphism Design**: تصميم زجاجي عصري مع تأثيرات ضبابية
- **Arabic RTL Support**: دعم كامل للغة العربية واتجاه النص من اليمين لليسار
- **Responsive Design**: يعمل بشكل مثالي على جميع الأجهزة
- **Dark Theme**: تصميم داكن أنيق مع تدرجات لونية جميلة

### 💰 نظام المبالغ
- **Minimum Amount**: 50 ريال كحد أدنى
- **Flexible Increments**: مضاعفات الـ 50 ريال فقط
- **Quick Selection**: أزرار سريعة للمبالغ الشائعة
- **Custom Amount**: إمكانية إدخال مبلغ مخصص
- **Real-time Validation**: التحقق الفوري من صحة المبلغ

### 🚀 التفاعلية
- **Smooth Animations**: رسوم متحركة سلسة ومتطورة
- **Ripple Effects**: تأثيرات موجية عند النقر
- **Loading States**: حالات تحميل واضحة وجميلة
- **Success Feedback**: تأكيد بصري للعمليات الناجحة
- **Error Handling**: معالجة أخطاء واضحة ومفيدة

### ♿ إمكانية الوصول
- **WCAG Compliance**: متوافق مع معايير إمكانية الوصول
- **Keyboard Navigation**: تنقل كامل بالكيبورد
- **Screen Reader Support**: دعم قارئات الشاشة
- **High Contrast Mode**: دعم وضع التباين العالي
- **Touch Optimized**: محسن للأجهزة اللمسية

## الملفات المكونة للنظام

### 1. FlexiblePayment.css
ملف الأنماط الرئيسي الذي يحتوي على:

```css
/* المتغيرات الأساسية */
:root {
  --primary-blue: #3B82F6;
  --secondary-purple: #8B5CF6;
  --success-green: #10B981;
  --error-red: #EF4444;
  --warning-yellow: #F59E0B;
}

/* أقسام رئيسية */
- .flexible-payment-container
- .payment-quick-amounts
- .custom-amount-section
- .payment-modal-overlay
- .validation-message
- .loading-states
```

#### المكونات الأساسية:

**Quick Amount Grid**
```css
.payment-quick-amounts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  direction: rtl;
}
```

**Custom Input with Currency**
```css
.custom-amount-input {
  text-align: right;
  direction: rtl;
  font-family: 'Tajawal', sans-serif;
  backdrop-filter: blur(20px);
}
```

**Glassmorphism Effects**
```css
.glass-effect {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### 2. FlexiblePayment.tsx
المكون الرئيسي المكتوب بـ TypeScript:

```typescript
interface PaymentState {
  amount: number | '';
  selectedQuickAmount: number | null;
  customAmount: string;
  isValid: boolean;
  error: string | null;
  isLoading: boolean;
  showModal: boolean;
}
```

#### الوظائف الرئيسية:

**التحقق من صحة المبلغ**
```typescript
const validateAmount = (amount: number | string): {
  isValid: boolean;
  error: string | null;
} => {
  // التحقق من الحد الأدنى
  // التحقق من مضاعفات الـ 50
  // التحقق من صحة الرقم
};
```

**معالجة الدفع**
```typescript
const handlePaymentSubmit = async () => {
  if (!state.isValid) return;

  setState(prev => ({ ...prev, isLoading: true }));

  try {
    await onPaymentSubmit(state.amount);
    setState(prev => ({ ...prev, showModal: true }));
  } catch (error) {
    // معالجة الأخطاء
  }
};
```

### 3. FlexiblePaymentDemo.tsx
صفحة عرض تفاعلية تشمل:
- عرض إحصائيات المساهمات
- سجل المعاملات
- عرض المميزات
- المواصفات التقنية

## الاستخدام

### الاستيراد
```typescript
import FlexiblePayment from './components/Subscriptions/FlexiblePayment';
import './components/Subscriptions/FlexiblePayment.css';
```

### الاستخدام الأساسي
```tsx
<FlexiblePayment
  onPaymentSubmit={handlePayment}
  minAmount={50}
  currency="ريال"
/>
```

### مثال متكامل
```tsx
const handlePaymentSubmit = async (amount: number) => {
  try {
    const response = await paymentAPI.processPayment({
      amount,
      currency: 'SAR',
      familyId: 'alshuail-family'
    });

    console.log('Payment successful:', response);
  } catch (error) {
    console.error('Payment failed:', error);
    throw error; // لإظهار رسالة الخطأ في المكون
  }
};

<FlexiblePayment
  onPaymentSubmit={handlePaymentSubmit}
  minAmount={50}
  currency="ريال"
  className="my-custom-payment"
/>
```

## الخصائص (Props)

| الخاصية | النوع | الافتراضي | الوصف |
|---------|------|----------|-------|
| `onPaymentSubmit` | `(amount: number) => Promise<void>` | - | دالة معالجة الدفع |
| `minAmount` | `number` | `50` | الحد الأدنى للمبلغ |
| `currency` | `string` | `'ريال'` | العملة المستخدمة |
| `className` | `string` | `''` | فئة CSS إضافية |

## الحالات والتحققات

### حالات التحقق
1. **مبلغ صحيح**: رقم موجب أكبر من الحد الأدنى
2. **مضاعفات 50**: المبلغ يجب أن يكون من مضاعفات الـ 50
3. **رقم صحيح**: التأكد من أن المدخل رقم صالح

### رسائل الخطأ
```typescript
const errorMessages = {
  'INVALID_AMOUNT': 'يرجى إدخال مبلغ صحيح',
  'BELOW_MINIMUM': 'الحد الأدنى للمبلغ هو 50 ريال',
  'INVALID_INCREMENT': 'المبلغ يجب أن يكون من مضاعفات الـ 50 ريال',
  'PAYMENT_FAILED': 'حدث خطأ أثناء معالجة الدفع'
};
```

## التخصيص

### تخصيص الألوان
```css
:root {
  --primary-blue: #your-color;
  --secondary-purple: #your-color;
  --success-green: #your-color;
  --error-red: #your-color;
}
```

### تخصيص المبالغ السريعة
```typescript
const customQuickAmounts = [
  { value: 100, label: 'مساهمة صغيرة' },
  { value: 250, label: 'مساهمة متوسطة' },
  { value: 500, label: 'مساهمة كبيرة' }
];
```

### إضافة مميزات جديدة
```css
.flexible-payment-container.premium {
  background: linear-gradient(135deg, gold, orange);
}

.payment-submit-btn.premium {
  background: linear-gradient(135deg, #FFD700, #FFA500);
}
```

## الاستجابة للأجهزة

### نقاط التوقف
```css
/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .payment-quick-amounts {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Tablet: 768px - 1023px */
@media (max-width: 1023px) and (min-width: 768px) {
  .payment-quick-amounts {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile: 767px- */
@media (max-width: 767px) {
  .payment-modal {
    border-radius: 24px 24px 0 0;
    position: fixed;
    bottom: 0;
  }
}
```

## إمكانية الوصول

### دعم قارئات الشاشة
```tsx
<button
  aria-label={`دفع ${amount} ${currency}`}
  aria-describedby="payment-instructions"
>
  تأكيد الدفع
</button>

<div id="payment-instructions" className="sr-only">
  اضغط Enter للتأكيد أو Escape للإلغاء
</div>
```

### التنقل بالكيبورد
- `Tab`: التنقل بين العناصر
- `Enter/Space`: تفعيل الأزرار
- `Escape`: إغلاق النوافذ المنبثقة
- `Arrow Keys`: التنقل بين المبالغ السريعة

## الأداء والتحسين

### تحسينات الأداء
1. **Lazy Loading**: تحميل المكونات عند الحاجة
2. **Memoization**: تخزين مؤقت للحسابات
3. **Debounced Validation**: تأخير التحقق لتقليل العمليات
4. **CSS Containment**: عزل تأثير الأنماط

### تحسينات الذاكرة
```typescript
const memoizedValidation = useMemo(() =>
  validateAmount(amount), [amount]
);

const debouncedAmount = useDebounce(customAmount, 500);
```

## الاختبار

### اختبارات الوحدة
```typescript
describe('FlexiblePayment', () => {
  test('validates minimum amount correctly', () => {
    const result = validateAmount(30);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('50');
  });

  test('accepts valid increments', () => {
    const result = validateAmount(150);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe(null);
  });
});
```

### اختبارات التكامل
```typescript
test('payment flow works correctly', async () => {
  const mockPayment = jest.fn().mockResolvedValue({});

  render(<FlexiblePayment onPaymentSubmit={mockPayment} />);

  fireEvent.click(screen.getByText('100 ريال'));
  fireEvent.click(screen.getByText('تأكيد الدفع'));

  await waitFor(() => {
    expect(mockPayment).toHaveBeenCalledWith(100);
  });
});
```

## التحديثات المستقبلية

### مميزات مخطط لها
- [ ] دعم عملات متعددة
- [ ] تكامل مع بوابات دفع متعددة
- [ ] حفظ طرق الدفع المفضلة
- [ ] نظام النقاط والمكافآت
- [ ] تقارير وإحصائيات متقدمة

### تحسينات تقنية
- [ ] Service Worker للعمل أوفلاين
- [ ] Web Push Notifications
- [ ] Progressive Web App
- [ ] Advanced Caching Strategy

## الدعم والمساعدة

### التواصل
- **البريد الإلكتروني**: dev@alshuail-family.com
- **الموقع**: https://alshuail-admin.com
- **التوثيق**: https://docs.alshuail-admin.com

### الإصدار
- **الإصدار الحالي**: 1.0.0
- **تاريخ الإصدار**: سبتمبر 2024
- **التحديث القادم**: أكتوبر 2024

---

تم تطوير هذا النظام بعناية فائقة ليقدم تجربة دفع مميزة تتماشى مع التطلعات الحديثة لعائلة آل الشعيل.
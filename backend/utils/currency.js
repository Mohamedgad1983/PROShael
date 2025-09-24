// تنسيق العملة السعودية - Saudi Riyal Formatting

// تنسيق المبلغ بالريال السعودي
const formatSAR = (amount) => {
  const formatter = new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
};

// تحويل النص إلى رقم عشري
const parseAmount = (text) => {
  // إزالة رمز العملة والمسافات
  const cleanText = text.replace(/[^\d.,\-]/g, '');
  // تحويل الفاصلة العربية إلى نقطة
  const normalizedText = cleanText.replace(/,/g, '.');
  return parseFloat(normalizedText);
};

// تحويل الأرقام إلى كلمات بالعربية
const numberToArabicWords = (num) => {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  if (num === 0) return 'صفر';
  if (num < 0) return 'سالب ' + numberToArabicWords(Math.abs(num));

  let result = '';

  // الآلاف
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) {
      result += 'ألف ';
    } else if (thousands === 2) {
      result += 'ألفان ';
    } else if (thousands <= 10) {
      result += ones[thousands] + ' آلاف ';
    } else {
      result += thousands + ' ألف ';
    }
    num %= 1000;
  }

  // المئات
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)] + ' ';
    num %= 100;
  }

  // العشرات والآحاد
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 11) {
    const special = ['أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    result += special[num - 11] + ' ';
    num = 0;
  } else if (num === 10) {
    result += 'عشرة ';
    num = 0;
  }

  if (num > 0) {
    result += ones[num] + ' ';
  }

  return result.trim() + ' ريال سعودي';
};

// حساب الزكاة
const calculateZakat = (amount, rate = 0.025) => {
  // الزكاة = 2.5% من المبلغ إذا بلغ النصاب
  const nisab = 3000; // النصاب التقريبي بالريال السعودي
  if (amount < nisab) {
    return {
      zakatAmount: 0,
      message: 'المبلغ أقل من النصاب'
    };
  }

  const zakatAmount = amount * rate;
  return {
    zakatAmount: zakatAmount,
    formattedAmount: formatSAR(zakatAmount),
    message: 'مبلغ الزكاة المستحق'
  };
};

module.exports = {
  formatSAR,
  parseAmount,
  numberToArabicWords,
  calculateZakat
};
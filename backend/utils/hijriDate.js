// مساعدات التاريخ الهجري - Hijri Date Helpers
const moment = require('moment-hijri');

// تعيين اللغة العربية
moment.locale('ar');

// دالة تحويل التاريخ الميلادي إلى هجري
const gregorianToHijri = (date) => {
  const m = moment(date);
  return {
    year: m.iYear(),
    month: m.iMonth() + 1,
    day: m.iDate(),
    monthName: getHijriMonthName(m.iMonth() + 1),
    dayName: m.format('dddd'),
    formatted: m.format('iYYYY/iM/iD'),
    fullFormatted: `${m.format('dddd')} ${m.iDate()} ${getHijriMonthName(m.iMonth() + 1)} ${m.iYear()} هـ`
  };
};

// دالة تحويل التاريخ الهجري إلى ميلادي
const hijriToGregorian = (year, month, day) => {
  const m = moment(`${year}/${month}/${day}`, 'iYYYY/iM/iD');
  return {
    year: m.year(),
    month: m.month() + 1,
    day: m.date(),
    formatted: m.format('YYYY-MM-DD'),
    fullFormatted: m.format('dddd D MMMM YYYY')
  };
};

// الحصول على اسم الشهر الهجري
const getHijriMonthName = (monthNumber) => {
  const months = [
    'محرم',
    'صفر',
    'ربيع الأول',
    'ربيع الآخر',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذو القعدة',
    'ذو الحجة'
  ];
  return months[monthNumber - 1] || '';
};

// الحصول على التاريخ الهجري الحالي
const getCurrentHijriDate = () => {
  const now = moment();
  return {
    year: now.iYear(),
    month: now.iMonth() + 1,
    day: now.iDate(),
    monthName: getHijriMonthName(now.iMonth() + 1),
    dayName: now.format('dddd'),
    formatted: now.format('iYYYY/iM/iD'),
    fullFormatted: `${now.format('dddd')} ${now.iDate()} ${getHijriMonthName(now.iMonth() + 1)} ${now.iYear()} هـ`,
    withTime: `${now.format('iYYYY/iM/iD')} - ${now.format('HH:mm:ss')}`
  };
};

// التحقق من صحة التاريخ الهجري
const isValidHijriDate = (year, month, day) => {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 30) return false;
  if (year < 1 || year > 1500) return false;

  // الأشهر التي بها 29 يوم
  const months29Days = [2, 4, 6, 8, 10];
  if (months29Days.includes(month) && day > 29) return false;

  return true;
};

// حساب العمر بالتقويم الهجري
const calculateHijriAge = (birthDate) => {
  const birth = moment(birthDate);
  const now = moment();

  const birthHijri = {
    year: birth.iYear(),
    month: birth.iMonth(),
    day: birth.iDate()
  };

  const nowHijri = {
    year: now.iYear(),
    month: now.iMonth(),
    day: now.iDate()
  };

  let years = nowHijri.year - birthHijri.year;
  let months = nowHijri.month - birthHijri.month;
  let days = nowHijri.day - birthHijri.day;

  if (days < 0) {
    months--;
    days += 30;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return {
    years,
    months,
    days,
    formatted: `${years} سنة و ${months} شهر و ${days} يوم`
  };
};

// الحصول على المناسبات الإسلامية
const getIslamicOccasions = (hijriMonth, hijriDay) => {
  const occasions = {
    '1-1': 'رأس السنة الهجرية',
    '1-10': 'يوم عاشوراء',
    '3-12': 'المولد النبوي الشريف',
    '7-27': 'الإسراء والمعراج',
    '9-1': 'بداية شهر رمضان المبارك',
    '9-27': 'ليلة القدر',
    '10-1': 'عيد الفطر المبارك',
    '12-10': 'عيد الأضحى المبارك'
  };

  const key = `${hijriMonth}-${hijriDay}`;
  return occasions[key] || null;
};

// دالة تنسيق التاريخ الهجري - Format Hijri date
const formatHijriDate = (date) => {
  return gregorianToHijri(date).fullFormatted;
};

module.exports = {
  gregorianToHijri,
  hijriToGregorian,
  getHijriMonthName,
  getCurrentHijriDate,
  isValidHijriDate,
  calculateHijriAge,
  getIslamicOccasions,
  formatHijriDate
};
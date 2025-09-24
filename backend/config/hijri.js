// مساعدات التقويم الهجري - Hijri Calendar Helpers
const moment = require('moment-hijri');

// تعيين اللغة العربية كافتراضية
moment.locale('ar');

// تحويل التاريخ الميلادي إلى هجري
const toHijri = (gregorianDate) => {
  return moment(gregorianDate).format('iYYYY/iM/iD');
};

// تحويل التاريخ الهجري إلى ميلادي
const toGregorian = (hijriYear, hijriMonth, hijriDay) => {
  return moment(`${hijriYear}/${hijriMonth}/${hijriDay}`, 'iYYYY/iM/iD').format('YYYY-MM-DD');
};

// الحصول على التاريخ الهجري الحالي
const getCurrentHijriDate = () => {
  return {
    year: moment().iYear(),
    month: moment().iMonth() + 1,
    day: moment().iDate(),
    formatted: moment().format('iYYYY/iM/iD'),
    arabicFormatted: moment().format('iD iMMMM iYYYY')
  };
};

// الأشهر الهجرية بالعربية
const hijriMonths = [
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

module.exports = {
  toHijri,
  toGregorian,
  getCurrentHijriDate,
  hijriMonths,
  moment
};
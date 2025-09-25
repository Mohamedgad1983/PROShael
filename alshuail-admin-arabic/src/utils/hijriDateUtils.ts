
interface HijriDate {
  year: number;
  month: number;
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

  };
}

/**
 */
export function getCurrentHijriDate(): HijriDate {
  return gregorianToHijri(new Date());
}

/**

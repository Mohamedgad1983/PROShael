/**
 * City → District Cascading Data
 * Data structure for Saudi cities and their districts
 */

export const cityDistrictData = {
  'riyadh': [
    { value: 'olaya', label: 'العليا' },
    { value: 'malaz', label: 'الملز' },
    { value: 'rawdah', label: 'الروضة' },
    { value: 'suwaidi', label: 'السويدي' },
    { value: 'shifa', label: 'الشفا' },
    { value: 'naseem', label: 'النسيم' },
    { value: 'granada', label: 'غرناطة' }
  ],
  'jeddah': [
    { value: 'albawadi', label: 'البوادي' },
    { value: 'alsalamah', label: 'السلامة' },
    { value: 'alsafa', label: 'الصفا' },
    { value: 'alrawdah', label: 'الروضة' },
    { value: 'alnazlah', label: 'النزلة' },
    { value: 'alnuzhah', label: 'النزهة' }
  ],
  'makkah': [
    { value: 'alaziziah', label: 'العزيزية' },
    { value: 'alnuzha', label: 'النزهة' },
    { value: 'alshawqiyah', label: 'الشوقية' },
    { value: 'alhasah', label: 'الحصاة' },
    { value: 'alhijrah', label: 'الهجرة' }
  ],
  'madinah': [
    { value: 'alaql', label: 'العقل' },
    { value: 'alazhar', label: 'الأزهار' },
    { value: 'alsalam', label: 'السلام' },
    { value: 'quba', label: 'قباء' },
    { value: 'alawali', label: 'العوالي' }
  ],
  'dammam': [
    { value: 'alnuzha', label: 'النزهة' },
    { value: 'alfaisaliyah', label: 'الفيصلية' },
    { value: 'almuraikabat', label: 'المريكبات' },
    { value: 'adamah', label: 'العدامة' },
    { value: 'alqusour', label: 'القصور' }
  ],
  'khobar': [
    { value: 'alakhdar', label: 'الأخضر' },
    { value: 'alulaya', label: 'العليا' },
    { value: 'althaqba', label: 'الثقبة' },
    { value: 'alrakah', label: 'الراكة' },
    { value: 'almulayda', label: 'المليدا' }
  ]
};

/**
 * Get districts for a specific city
 * @param {string} cityValue - The city value
 * @returns {Array} Array of district options
 */
export const getDistrictsByCity = (cityValue) => {
  return cityDistrictData[cityValue] || [];
};

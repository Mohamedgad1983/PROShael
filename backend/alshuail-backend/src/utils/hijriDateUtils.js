/**
 * Hijri Date Management Utilities
 * Handles conversion between Gregorian and Hijri calendars
 * Using JavaScript's native Intl API for accurate conversions
 */

export class HijriDateManager {
  /**
   * Get list of Hijri months with names in Arabic and English
   */
  static getHijriMonths() {
    return [
      { number: 1, name_ar: 'محرم', name_en: 'Muharram', is_sacred: true },
      { number: 2, name_ar: 'صفر', name_en: 'Safar', is_sacred: false },
      { number: 3, name_ar: 'ربيع الأول', name_en: 'Rabi al-Awwal', is_sacred: false },
      { number: 4, name_ar: 'ربيع الآخر', name_en: 'Rabi al-Thani', is_sacred: false },
      { number: 5, name_ar: 'جمادى الأولى', name_en: 'Jumada al-Awwal', is_sacred: false },
      { number: 6, name_ar: 'جمادى الآخرة', name_en: 'Jumada al-Thani', is_sacred: false },
      { number: 7, name_ar: 'رجب', name_en: 'Rajab', is_sacred: true },
      { number: 8, name_ar: 'شعبان', name_en: 'Shaban', is_sacred: false },
      { number: 9, name_ar: 'رمضان', name_en: 'Ramadan', is_sacred: false, is_special: true },
      { number: 10, name_ar: 'شوال', name_en: 'Shawwal', is_sacred: false },
      { number: 11, name_ar: 'ذو القعدة', name_en: 'Dhul Qadah', is_sacred: true },
      { number: 12, name_ar: 'ذو الحجة', name_en: 'Dhul Hijjah', is_sacred: true, is_special: true }
    ];
  }

  /**
   * Convert Gregorian date to Hijri components
   * @param {Date} date - Gregorian date
   * @returns {Object} Hijri date components
   */
  static convertToHijri(date) {
    try {
      const dateToConvert = date instanceof Date ? date : new Date(date);

      // Get full Hijri date string
      const hijriString = dateToConvert.toLocaleDateString('ar-SA-u-ca-islamic', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Extract individual components
      const year = parseInt(dateToConvert.toLocaleDateString('ar-SA-u-ca-islamic', {
        year: 'numeric'
      }).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

      const month = parseInt(dateToConvert.toLocaleDateString('ar-SA-u-ca-islamic', {
        month: 'numeric'
      }).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

      const day = parseInt(dateToConvert.toLocaleDateString('ar-SA-u-ca-islamic', {
        day: 'numeric'
      }).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

      const monthData = this.getHijriMonths().find(m => m.number === month);

      return {
        hijri_date_string: hijriString,
        hijri_year: year,
        hijri_month: month,
        hijri_day: day,
        hijri_month_name: monthData ? monthData.name_ar : '',
        hijri_month_name_en: monthData ? monthData.name_en : '',
        is_sacred_month: monthData ? monthData.is_sacred : false,
        is_special_month: monthData ? monthData.is_special : false
      };
    } catch (error) {
      console.error('Error converting to Hijri:', error);
      return null;
    }
  }

  /**
   * Get current Hijri date
   * @returns {Object} Current Hijri date components
   */
  static getCurrentHijriDate() {
    return this.convertToHijri(new Date());
  }

  /**
   * Format Hijri date for display
   * @param {string} hijriDateString - Hijri date string
   * @returns {string} Formatted Hijri date
   */
  static formatHijriDisplay(hijriDateString) {
    if (!hijriDateString) return '';

    // Remove extra spaces and format nicely
    return hijriDateString.replace(/\s+/g, ' ').trim();
  }

  /**
   * Format Gregorian date as secondary display
   * @param {Date|string} date - Gregorian date
   * @returns {string} Formatted Gregorian date
   */
  static formatGregorianSecondary(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }

  /**
   * Build Hijri filter for database queries
   * @param {number} hijriMonth - Hijri month (1-12)
   * @param {number} hijriYear - Hijri year
   * @returns {Object} Filter object
   */
  static buildHijriFilter(hijriMonth, hijriYear) {
    const currentHijri = this.getCurrentHijriDate();
    return {
      hijri_month: hijriMonth || currentHijri.hijri_month,
      hijri_year: hijriYear || currentHijri.hijri_year
    };
  }

  /**
   * Get Hijri year range for dropdown
   * @param {number} range - Number of years before and after current
   * @returns {Array} Array of years
   */
  static getHijriYearRange(range = 2) {
    const currentHijri = this.getCurrentHijriDate();
    const years = [];

    for (let i = -range; i <= range; i++) {
      years.push({
        value: currentHijri.hijri_year + i,
        label: `${currentHijri.hijri_year + i} هـ`,
        is_current: i === 0
      });
    }

    return years;
  }

  /**
   * Check if a month is sacred or special
   * @param {number} monthNumber - Month number (1-12)
   * @returns {Object} Month properties
   */
  static getMonthProperties(monthNumber) {
    const month = this.getHijriMonths().find(m => m.number === monthNumber);
    return {
      is_sacred: month?.is_sacred || false,
      is_special: month?.is_special || false,
      name_ar: month?.name_ar || '',
      name_en: month?.name_en || ''
    };
  }

  /**
   * Compare two Hijri dates
   * @param {Object} date1 - First Hijri date object
   * @param {Object} date2 - Second Hijri date object
   * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
   */
  static compareHijriDates(date1, date2) {
    if (date1.hijri_year !== date2.hijri_year) {
      return date1.hijri_year < date2.hijri_year ? -1 : 1;
    }
    if (date1.hijri_month !== date2.hijri_month) {
      return date1.hijri_month < date2.hijri_month ? -1 : 1;
    }
    if (date1.hijri_day !== date2.hijri_day) {
      return date1.hijri_day < date2.hijri_day ? -1 : 1;
    }
    return 0;
  }

  /**
   * Group items by Hijri month
   * @param {Array} items - Array of items with Hijri date fields
   * @returns {Object} Items grouped by Hijri month
   */
  static groupByHijriMonth(items) {
    return items.reduce((groups, item) => {
      const key = `${item.hijri_month_name} ${item.hijri_year}`;
      if (!groups[key]) {
        groups[key] = {
          month: item.hijri_month,
          year: item.hijri_year,
          month_name: item.hijri_month_name,
          items: [],
          total_amount: 0
        };
      }
      groups[key].items.push(item);
      groups[key].total_amount += Number(item.amount || 0);
      return groups;
    }, {});
  }

  /**
   * Calculate days until end of Hijri month
   * @param {Date} date - Date to check
   * @returns {number} Days remaining in month
   */
  static daysUntilEndOfHijriMonth(date = new Date()) {
    // Hijri months are typically 29-30 days
    const hijriDate = this.convertToHijri(date);

    // Check next 30 days to find when month changes
    for (let i = 1; i <= 30; i++) {
      const futureDate = new Date(date);
      futureDate.setDate(futureDate.getDate() + i);
      const futureHijri = this.convertToHijri(futureDate);

      if (futureHijri.hijri_month !== hijriDate.hijri_month) {
        return i - 1;
      }
    }

    return 0;
  }
}

/**
 * Helper function to convert date to Hijri string
 * @param {Date} date - Date to convert
 * @returns {string} Hijri date string
 */
export const convertToHijriString = (date) => {
  const hijri = HijriDateManager.convertToHijri(date);
  return hijri ? hijri.hijri_date_string : '';
};

/**
 * Helper function to get Hijri year
 * @param {Date} date - Date to convert
 * @returns {number} Hijri year
 */
export const convertToHijriYear = (date) => {
  const hijri = HijriDateManager.convertToHijri(date);
  return hijri ? hijri.hijri_year : null;
};

/**
 * Helper function to get Hijri month
 * @param {Date} date - Date to convert
 * @returns {number} Hijri month
 */
export const convertToHijriMonth = (date) => {
  const hijri = HijriDateManager.convertToHijri(date);
  return hijri ? hijri.hijri_month : null;
};

/**
 * Helper function to get Hijri day
 * @param {Date} date - Date to convert
 * @returns {number} Hijri day
 */
export const convertToHijriDay = (date) => {
  const hijri = HijriDateManager.convertToHijri(date);
  return hijri ? hijri.hijri_day : null;
};

/**
 * Helper function to get Hijri month name
 * @param {Date} date - Date to convert
 * @returns {string} Hijri month name in Arabic
 */
export const convertToHijriMonthName = (date) => {
  const hijri = HijriDateManager.convertToHijri(date);
  return hijri ? hijri.hijri_month_name : '';
};

export default HijriDateManager;
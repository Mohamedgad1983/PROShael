// توليد كلمة مرور مؤقتة بسيطة
function generateTempPassword() {
  const numbers = Math.floor(Math.random() * 9000) + 1000; // 4 أرقام
  const letters = Math.random().toString(36).substring(2, 4).toUpperCase(); // حرفين
  return `${numbers}${letters}`; // مثال: 1234AB
}

// توليد رقم عضوية
function generateMembershipNumber() {
  const timestamp = Date.now().toString().slice(-6); // آخر 6 أرقام من الوقت
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `SH${timestamp}${random}`; // مثال: SH123456AB
}

// التحقق من قوة كلمة المرور
function validatePasswordStrength(password) {
  if (!password || password.length < 8) return false;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);

  return hasUpper && hasLower && hasNumber && hasSpecial;
}

// تنسيق الاسم العربي
function formatArabicName(name) {
  return name.trim()
    .split(/\s+/)
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join(' ');
}

// التحقق من صحة الاسم العربي (3-4 أجزاء)
function validateArabicName(name) {
  if (!name || typeof name !== 'string') return false;

  const trimmedName = name.trim();
  const nameParts = trimmedName.split(/\s+/);

  // يجب أن يكون الاسم من 3 إلى 4 أجزاء
  if (nameParts.length < 3 || nameParts.length > 4) return false;

  // التحقق من وجود أحرف عربية
  const arabicRegex = /[\u0600-\u06FF]/;
  return nameParts.every(part => arabicRegex.test(part) && part.length > 1);
}

// توليد رقم هاتف عشوائي للاختبار
function generateTestPhone() {
  const prefixes = ['050', '051', '052', '053', '054', '055', '056', '057', '058', '059'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const numbers = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return prefix + numbers;
}

// توليد إيميل عشوائي للاختبار
function generateTestEmail(name) {
  const cleanName = name.toLowerCase()
    .replace(/[\u0600-\u06FF]/g, '') // إزالة الأحرف العربية
    .replace(/\s+/g, '')
    .substring(0, 8);

  const timestamp = Date.now().toString().slice(-4);
  return `${cleanName || 'member'}${timestamp}@alshuail.com`;
}

module.exports = {
  generateTempPassword,
  generateMembershipNumber,
  validatePasswordStrength,
  formatArabicName,
  validateArabicName,
  generateTestPhone,
  generateTestEmail
};
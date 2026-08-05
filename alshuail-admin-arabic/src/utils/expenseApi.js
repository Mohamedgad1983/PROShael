const STATUS_MESSAGES = {
  401: 'انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.',
  403: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  404: 'لم يتم العثور على المصروف المطلوب.',
  409: 'لا يمكن تعديل هذا المصروف في حالته الحالية.',
  413: 'حجم ملف الإيصال أكبر من الحد المسموح (10 ميجابايت).',
  429: 'تم تجاوز الحد الأقصى للطلبات. يرجى الانتظار قليلاً.',
  500: 'تعذر إكمال العملية حالياً. يرجى المحاولة مرة أخرى.'
};

export const parseExpenseApiResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const arabicError = typeof payload.error === 'string' && /[\u0600-\u06FF]/.test(payload.error)
      ? payload.error
      : '';
    const error = new Error(
      payload.message_ar || arabicError || STATUS_MESSAGES[response.status] ||
      'تعذر إكمال العملية. يرجى المحاولة مرة أخرى.'
    );
    error.status = response.status;
    error.code = payload.code;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const getExpenseErrorMessage = (error, fallback = 'تعذر إكمال العملية. يرجى المحاولة مرة أخرى.') => {
  if (error?.name === 'AbortError') {
    return 'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.';
  }

  return error?.message || STATUS_MESSAGES[error?.status] || fallback;
};

export const emptyExpenseForm = () => ({
  title_ar: '',
  title_en: '',
  description_ar: '',
  description_en: '',
  amount: '',
  category: '',
  expense_date: new Date().toISOString().split('T')[0],
  paid_to: '',
  receipt_image: null,
  notes: ''
});

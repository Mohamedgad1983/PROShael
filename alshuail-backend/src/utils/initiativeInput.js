const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const INITIATIVE_ADMIN_ROLES = Object.freeze([
  'super_admin',
  'admin',
  'financial_manager',
  'operational_manager',
  'occasions_initiatives_diyas_admin'
]);

export const INITIATIVE_STATUSES = Object.freeze([
  'draft',
  'active',
  'completed',
  'archived'
]);

export const isUuid = (value) => UUID_PATTERN.test(String(value || '').trim());

const normalizeText = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeOptionalAmount = (value, label, errors) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || String(value).trim() === '') {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    errors.push(`${label} يجب أن يكون رقماً موجباً أو صفراً`);
    return null;
  }

  return amount;
};

const normalizeOptionalDate = (value, label, errors) => {
  const normalized = normalizeText(value);
  if (normalized === undefined || normalized === null) {
    return normalized;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    errors.push(`${label} غير صالح`);
    return null;
  }

  return normalized;
};

/**
 * Normalize the public initiative form contract. Technical identifiers such
 * as id/created_by are deliberately excluded and are resolved by the server.
 */
export const normalizeInitiativeInput = (input = {}, { partial = false } = {}) => {
  const errors = [];
  const data = {};
  const textFields = [
    'title_ar',
    'title_en',
    'description_ar',
    'description_en',
    'beneficiary_name_ar',
    'beneficiary_name_en'
  ];

  for (const field of textFields) {
    const normalized = normalizeText(input[field]);
    if (normalized !== undefined) {
      data[field] = normalized;
    }
  }

  if (!partial && !data.title_ar) {
    errors.push('عنوان المبادرة بالعربية مطلوب');
  } else if (partial && Object.prototype.hasOwnProperty.call(input, 'title_ar') && !data.title_ar) {
    errors.push('عنوان المبادرة بالعربية مطلوب');
  }

  for (const [field, label] of [
    ['target_amount', 'المبلغ المستهدف'],
    ['min_contribution', 'الحد الأدنى للمساهمة'],
    ['max_contribution', 'الحد الأقصى للمساهمة']
  ]) {
    const normalized = normalizeOptionalAmount(input[field], label, errors);
    if (normalized !== undefined) {
      data[field] = normalized;
    }
  }

  const startDate = normalizeOptionalDate(input.start_date, 'تاريخ البداية', errors);
  const endDate = normalizeOptionalDate(input.end_date, 'تاريخ النهاية', errors);
  if (startDate !== undefined) {
    data.start_date = startDate;
  }
  if (endDate !== undefined) {
    data.end_date = endDate;
  }

  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    errors.push('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
  }

  if (data.min_contribution !== null && data.min_contribution !== undefined &&
      data.max_contribution !== null && data.max_contribution !== undefined &&
      data.min_contribution > data.max_contribution) {
    errors.push('الحد الأدنى للمساهمة لا يمكن أن يتجاوز الحد الأقصى');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'status') || !partial) {
    const status = normalizeText(input.status) || 'draft';
    if (!INITIATIVE_STATUSES.includes(status)) {
      errors.push('حالة المبادرة غير صالحة');
    } else {
      data.status = status;
    }
  }

  return { data, errors };
};

export const initiativeProgress = (currentAmount, targetAmount) => {
  const current = Number(currentAmount) || 0;
  const target = Number(targetAmount);

  if (!Number.isFinite(target) || target <= 0) {
    return null;
  }
  return Math.min(100, Math.max(0, (current / target) * 100));
};

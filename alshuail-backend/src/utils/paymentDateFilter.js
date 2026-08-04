const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const PAYMENT_REPORTING_TIMEZONE = 'Asia/Kuwait';

export class PaymentDateFilterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentDateFilterError';
    this.statusCode = 400;
  }
}
function normalizeDateOnly(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  if (!ISO_DATE_PATTERN.test(normalized)) {
    throw new PaymentDateFilterError(`${label} يجب أن يكون بصيغة YYYY-MM-DD`);
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  if (!isRealDate) {
    throw new PaymentDateFilterError(`${label} غير صالح`);
  }

  return normalized;
}

/**
 * Accept both the current API names (start_date/end_date) and the report-style
 * aliases (date_from/date_to). Dates represent the Kuwait calendar day in which
 * the payment reached the backend, not the payment's optional accounting date.
 */
export function normalizePaymentReceivedDateRange(query = {}) {
  const startDate = normalizeDateOnly(
    query.start_date ?? query.date_from,
    'تاريخ البداية'
  );
  const endDate = normalizeDateOnly(
    query.end_date ?? query.date_to,
    'تاريخ النهاية'
  );

  if (startDate && endDate && startDate > endDate) {
    throw new PaymentDateFilterError('تاريخ البداية يجب ألا يكون بعد تاريخ النهاية');
  }

  return { startDate, endDate };
}

/**
 * Adds index-friendly timestamptz boundaries. Kuwait is fixed at UTC+03:00,
 * and PostgreSQL performs the conversion explicitly so the server/session
 * timezone cannot shift a payment into the previous or next day.
 */
export function appendPaymentReceivedDateFilters({
  conditions,
  params,
  paramIndex,
  startDate,
  endDate,
  column = 'p.created_at'
}) {
  let nextParamIndex = paramIndex;

  if (startDate) {
    conditions.push(
      `${column} >= ($${nextParamIndex++}::date::timestamp AT TIME ZONE '${PAYMENT_REPORTING_TIMEZONE}')`
    );
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(
      `${column} < (($${nextParamIndex++}::date + INTERVAL '1 day')::timestamp AT TIME ZONE '${PAYMENT_REPORTING_TIMEZONE}')`
    );
    params.push(endDate);
  }

  return nextParamIndex;
}

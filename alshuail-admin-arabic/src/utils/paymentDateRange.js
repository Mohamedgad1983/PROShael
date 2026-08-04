const KUWAIT_TIMEZONE = 'Asia/Kuwait';

const kuwaitDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: KUWAIT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const receivedAtFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  timeZone: KUWAIT_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const toDateInputValue = (date) => {
  const parts = kuwaitDatePartsFormatter.formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const shiftDateOnly = (dateOnly, days) => {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

export const getPaymentDatePreset = (preset, now = new Date()) => {
  const today = toDateInputValue(now);

  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'last7':
      return { start: shiftDateOnly(today, -6), end: today };
    case 'month':
      return { start: `${today.slice(0, 7)}-01`, end: today };
    default:
      return { start: '', end: '' };
  }
};

export const formatPaymentReceivedAt = (value) => {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return receivedAtFormatter.format(date);
};

export { KUWAIT_TIMEZONE };

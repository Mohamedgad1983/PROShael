export interface InitiativeFormValues {
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  beneficiary_name_ar: string;
  beneficiary_name_en: string;
  target_amount: string;
  min_contribution: string;
  max_contribution: string;
  start_date: string;
  end_date: string;
  status: string;
}

const optionalNumber = (value: string): number | null => {
  const normalized = value.trim();
  return normalized === '' ? null : Number(normalized);
};

const optionalText = (value: string): string | null => {
  const normalized = value.trim();
  return normalized === '' ? null : normalized;
};

/**
 * Convert empty optional fields to null before calling the API. Initiative IDs
 * and creator IDs are intentionally absent: the backend owns both values.
 */
export const buildInitiativePayload = (form: InitiativeFormValues) => ({
  title_ar: form.title_ar.trim(),
  title_en: optionalText(form.title_en),
  description_ar: optionalText(form.description_ar),
  description_en: optionalText(form.description_en),
  beneficiary_name_ar: optionalText(form.beneficiary_name_ar),
  beneficiary_name_en: optionalText(form.beneficiary_name_en),
  target_amount: optionalNumber(form.target_amount),
  min_contribution: optionalNumber(form.min_contribution),
  max_contribution: optionalNumber(form.max_contribution),
  start_date: optionalText(form.start_date),
  end_date: optionalText(form.end_date),
  status: form.status
});

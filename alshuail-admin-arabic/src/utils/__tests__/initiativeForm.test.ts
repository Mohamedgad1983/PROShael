import { buildInitiativePayload } from '../initiativeForm';

describe('buildInitiativePayload', () => {
  it('does not require or send a UUID and keeps the financial target optional', () => {
    const payload = buildInitiativePayload({
      title_ar: ' مبادرة اجتماعية ',
      title_en: '',
      description_ar: '',
      description_en: '',
      beneficiary_name_ar: '',
      beneficiary_name_en: '',
      target_amount: '',
      min_contribution: '',
      max_contribution: '',
      start_date: '',
      end_date: '',
      status: 'active'
    });

    expect(payload).toEqual(expect.objectContaining({
      title_ar: 'مبادرة اجتماعية',
      target_amount: null,
      min_contribution: null,
      max_contribution: null
    }));
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('created_by');
  });

  it('converts entered amounts to numbers', () => {
    const payload = buildInitiativePayload({
      title_ar: 'مبادرة', title_en: '', description_ar: '', description_en: '',
      beneficiary_name_ar: '', beneficiary_name_en: '', target_amount: '6000.50',
      min_contribution: '10', max_contribution: '500', start_date: '', end_date: '', status: 'draft'
    });

    expect(payload.target_amount).toBe(6000.5);
    expect(payload.min_contribution).toBe(10);
    expect(payload.max_contribution).toBe(500);
  });
});

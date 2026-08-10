import { fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import React from 'react';
import {
  MarriageInitiativeOption,
  MarriageMemberOption,
  MarriageRequest,
  marriageSupportService,
} from '../../../services/marriageSupportService';
import MarriageSupportDetail from '../MarriageSupportDetail';

jest.mock('../../../services/marriageSupportService', () => {
  const actual = jest.requireActual('../../../services/marriageSupportService');
  return {
    ...actual,
    marriageSupportService: {
      ...actual.marriageSupportService,
      getOne: jest.fn(),
      listInitiativeOptions: jest.fn(),
      searchWitnessCandidates: jest.fn(),
      linkInitiative: jest.fn(),
      enterData: jest.fn(),
      chairmanApprove: jest.fn(),
    },
  };
});

const mockedService = marriageSupportService as jest.Mocked<typeof marriageSupportService>;

const initiativeOptions: MarriageInitiativeOption[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title_ar: 'مبادرة دعم زواج محمد',
    status: 'active',
    current_amount: 1250,
    target_amount: 5000,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title_ar: 'مبادرة دعم زواج خالد',
    status: 'completed',
    current_amount: 5000,
    target_amount: 5000,
  },
];

const witnessCandidates: MarriageMemberOption[] = [
  { id: 'member-id', full_name: 'محمد شعيل', membership_number: 'M-100', phone: '50000000' },
  { id: 'witness-one-id', full_name: 'سالم شعيل', membership_number: 'M-201', phone: '51111111' },
  { id: 'witness-two-id', full_name: 'ناصر شعيل', membership_number: 'M-202', phone: '52222222' },
];

const requestFixture = (status: MarriageRequest['status']): MarriageRequest => ({
  id: 'request-id',
  sequence_number: 'MS-2026-001',
  sequence_year: 2026,
  sequence_in_year: 1,
  member_id: 'member-id',
  applicant_name: 'محمد شعيل',
  national_id: '1234567890',
  spouse_name_ar: 'نورة محمد',
  marriage_date: '2026-08-01',
  status,
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
  signatures: [],
  history: [],
});

const renderDetail = async (
  status: MarriageRequest['status'] = 'under_committee_review',
  role = 'marriage_committee_chair'
) => {
  const request = requestFixture(status);
  localStorage.setItem('user_data', JSON.stringify({ id: 'admin-id', role, full_name_ar: 'المسؤول' }));
  mockedService.getOne.mockResolvedValue(request);
  mockedService.listInitiativeOptions.mockResolvedValue(initiativeOptions);
  mockedService.searchWitnessCandidates.mockResolvedValue(witnessCandidates);
  mockedService.linkInitiative.mockResolvedValue(request);
  mockedService.enterData.mockResolvedValue(request);
  mockedService.chairmanApprove.mockResolvedValue(request);

  render(<MarriageSupportDetail requestId="request-id" onClose={jest.fn()} onChange={jest.fn()} />);
  await waitFor(() => expect(screen.queryByText('جاري التحميل…')).not.toBeInTheDocument());
  return request;
};

describe('MarriageSupportDetail contained action forms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('loads initiatives by name and submits the selected internal ID without exposing technical identifiers', async () => {
    const promptSpy = jest.spyOn(window, 'prompt');
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'ربط مبادرة' }));
    const dialog = screen.getByRole('dialog', { name: 'ربط مبادرة بالطلب' });
    const initiativeSearch = within(dialog).getByLabelText('البحث باسم المبادرة');
    expect(initiativeSearch).toHaveFocus();
    expect(within(dialog).queryByText(/UUID/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/معرف المبادرة/i)).not.toBeInTheDocument();

    await waitFor(() => expect(mockedService.listInitiativeOptions).toHaveBeenCalledTimes(1));
    const initiativeSelect = await within(dialog).findByRole('combobox', { name: /اختر المبادرة/ });
    expect(within(dialog).getByText(/مبادرة دعم زواج محمد — نشطة/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'ربط المبادرة' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('اختر مبادرة من القائمة');
    expect(mockedService.linkInitiative).not.toHaveBeenCalled();

    fireEvent.change(initiativeSearch, { target: { value: 'محمد' } });
    fireEvent.change(initiativeSelect, { target: { value: initiativeOptions[0].id } });
    expect(within(dialog).getByText('المبادرة المختارة')).toBeInTheDocument();
    expect(within(dialog).getByText('المحصّل: ١٬٢٥٠ ر.س')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'ربط المبادرة' }));

    await waitFor(() => expect(mockedService.linkInitiative).toHaveBeenCalledWith('request-id', initiativeOptions[0].id));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'ربط مبادرة بالطلب' })).not.toBeInTheDocument());
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  test('selects distinct non-beneficiary witnesses by member details and submits their internal IDs', async () => {
    await renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'إدخال البيانات وحساب المبلغ' }));
    const dialog = screen.getByRole('dialog', { name: 'إدخال البيانات وحساب المبلغ' });
    expect(within(dialog).queryByText(/UUID/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/معرف الشاهد/i)).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/مجموع المساهمات/), { target: { value: '-1' } });
    fireEvent.change(within(dialog).getByLabelText(/عدد العنانيات السابقة/), { target: { value: '1.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ البيانات وحساب المبلغ' }));
    expect(within(dialog).getByText('أدخل مجموع المساهمات كرقم موجب أو صفر.')).toBeInTheDocument();
    expect(within(dialog).getByText('عدد العنانيات السابقة يجب أن يكون عدداً صحيحاً.')).toBeInTheDocument();
    expect(within(dialog).getByText('اختر الشاهد الأول من نتائج البحث.')).toBeInTheDocument();
    expect(within(dialog).getByText('اختر الشاهد الثاني من نتائج البحث.')).toBeInTheDocument();
    expect(mockedService.enterData).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByRole('combobox', { name: /اختيار الشاهد الأول/ }), {
      target: { value: 'سالم' },
    });
    await waitFor(() => expect(mockedService.searchWitnessCandidates).toHaveBeenCalledWith('سالم'));
    const witness1Results = await within(dialog).findByRole('listbox', { name: 'نتائج اختيار الشاهد الأول' });
    expect(within(witness1Results).queryByText('محمد شعيل')).not.toBeInTheDocument();
    fireEvent.click(within(witness1Results).getByRole('option', { name: /سالم شعيل.*M-201.*51111111/ }));

    fireEvent.change(within(dialog).getByRole('combobox', { name: /اختيار الشاهد الثاني/ }), {
      target: { value: 'ناصر' },
    });
    await waitFor(() => expect(mockedService.searchWitnessCandidates).toHaveBeenCalledWith('ناصر'));
    const witness2Results = await within(dialog).findByRole('listbox', { name: 'نتائج اختيار الشاهد الثاني' });
    expect(within(witness2Results).queryByText('محمد شعيل')).not.toBeInTheDocument();
    expect(within(witness2Results).queryByText('سالم شعيل')).not.toBeInTheDocument();
    fireEvent.click(within(witness2Results).getByRole('option', { name: /ناصر شعيل.*M-202.*52222222/ }));

    expect(within(dialog).getByText('رقم العضوية: M-201 · 51111111')).toBeInTheDocument();
    expect(within(dialog).getByText('رقم العضوية: M-202 · 52222222')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/مجموع المساهمات/), { target: { value: '1250.5' } });
    fireEvent.change(within(dialog).getByLabelText(/عدد العنانيات السابقة/), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ البيانات وحساب المبلغ' }));

    await waitFor(() => expect(mockedService.enterData).toHaveBeenCalledWith('request-id', {
      contributions_sum: 1250.5,
      previous_ananiyat_count_override: null,
      additional_support_balance: 0,
      special_ananiya_value: 0,
      witness_1_id: 'witness-one-id',
      witness_1_name: 'سالم شعيل',
      witness_2_id: 'witness-two-id',
      witness_2_name: 'ناصر شعيل',
    }));
  });

  test('cancels safely and shows a disabled loading state while chairman approval is submitted', async () => {
    await renderDetail('signatures_complete', 'super_admin');

    fireEvent.click(screen.getByRole('button', { name: 'اعتماد رئيس الصندوق' }));
    let dialog = screen.getByRole('dialog', { name: 'اعتماد رئيس الصندوق' });
    fireEvent.change(within(dialog).getByLabelText('ملاحظة رئيس الصندوق'), {
      target: { value: 'لن تُحفظ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }));
    expect(screen.queryByRole('dialog', { name: 'اعتماد رئيس الصندوق' })).not.toBeInTheDocument();
    expect(mockedService.chairmanApprove).not.toHaveBeenCalled();

    let resolveApproval: ((request: MarriageRequest) => void) | undefined;
    mockedService.chairmanApprove.mockReturnValue(new Promise((resolve) => {
      resolveApproval = resolve;
    }));

    fireEvent.click(screen.getByRole('button', { name: 'اعتماد رئيس الصندوق' }));
    dialog = screen.getByRole('dialog', { name: 'اعتماد رئيس الصندوق' });
    fireEvent.change(within(dialog).getByLabelText('ملاحظة رئيس الصندوق'), {
      target: { value: '  اعتماد   بعد المراجعة  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد اعتماد الطلب' }));

    expect(within(dialog).getByRole('button', { name: 'جارٍ اعتماد الطلب…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'إلغاء' })).toBeDisabled();
    expect(mockedService.chairmanApprove).toHaveBeenCalledWith('request-id', 'اعتماد بعد المراجعة');

    resolveApproval?.(requestFixture('approved_by_chairman'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'اعتماد رئيس الصندوق' })).not.toBeInTheDocument());
  });
});

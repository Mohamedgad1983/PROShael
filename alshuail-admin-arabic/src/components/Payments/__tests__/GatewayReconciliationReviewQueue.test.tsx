import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import React from 'react';

import {
  GatewayReconciliationReviewItem,
  gatewayReconciliationReviewService,
} from '../../../services/gatewayReconciliationReviewService';
import GatewayReconciliationReviewQueue from '../GatewayReconciliationReviewQueue';

jest.mock('../../../services/gatewayReconciliationReviewService', () => {
  const actual = jest.requireActual('../../../services/gatewayReconciliationReviewService');
  return {
    ...actual,
    gatewayReconciliationReviewService: {
      listReviewRequired: jest.fn(),
      act: jest.fn(),
    },
  };
});

const mockedService = gatewayReconciliationReviewService as jest.Mocked<typeof gatewayReconciliationReviewService>;
const paymentId = '11111111-1111-4111-8111-111111111111';

const reviewItem: GatewayReconciliationReviewItem = {
  payment_id: paymentId,
  payment_reference: 'MOY-20260820-REVIEW',
  member_name: 'أحمد محمد الشعيل',
  member_phone_masked: '+966••••00',
  category: 'subscription',
  payment_status: 'cancelled',
  amount: 100,
  currency: 'SAR',
  gateway_provider: 'moyasar',
  gateway_payment_id_masked: '••••123456789012',
  is_financing: false,
  last_provider_status: null,
  last_provider_http_status: 404,
  last_result: 'review_required',
  review_reason: 'provider_not_found_bounded',
  consecutive_not_found: 4,
  consecutive_failures: 4,
  check_count: 5,
  first_not_found_at: '2026-08-19T00:00:00.000Z',
  last_checked_at: '2026-08-20T00:00:00.000Z',
  evidence_hash_masked: '12345678…87654321',
  reconciliation_started_at: '2026-08-18T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
};

const pageWith = (items: GatewayReconciliationReviewItem[]) => ({
  items,
  total: items.length,
  page: 1,
  limit: 24,
  total_pages: items.length ? 1 : 0,
  status: 'review_required' as const,
});

describe('GatewayReconciliationReviewQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.listReviewRequired.mockResolvedValue(pageWith([reviewItem]));
  });

  test('renders a masked RTL read-only queue for the financial manager', async () => {
    const unsafeItem = {
      ...reviewItem,
      gateway_payment_id: 'raw-provider-id',
      gateway_response: { source: { token: 'provider-secret' } },
    } as GatewayReconciliationReviewItem;
    mockedService.listReviewRequired.mockResolvedValue(pageWith([unsafeItem]));

    render(<GatewayReconciliationReviewQueue currentUserRole="financial_manager" />);

    expect(await screen.findByText('أحمد محمد الشعيل')).toBeInTheDocument();
    expect(screen.getByText('لم يعثر المزود على العملية')).toBeInTheDocument();
    expect(screen.getByText(/وضع القراءة فقط/)).toBeInTheDocument();
    expect(screen.getByText('للعرض فقط')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة الآمنة' })).not.toBeInTheDocument();
    expect(screen.queryByText('raw-provider-id')).not.toBeInTheDocument();
    expect(screen.queryByText('provider-secret')).not.toBeInTheDocument();
  });

  test('super admin requeues the selected row without any UUID input', async () => {
    const onCountChange = jest.fn();
    mockedService.act.mockResolvedValue({
      payment_id: paymentId,
      action: 'requeue',
      state: 'checked',
      next_check_at: '2026-08-20T10:00:00.000Z',
      review_action_id: 'audit-action-1',
    });
    mockedService.listReviewRequired
      .mockResolvedValueOnce(pageWith([reviewItem]))
      .mockResolvedValueOnce(pageWith([]));

    render(
      <GatewayReconciliationReviewQueue
        currentUserRole="super_admin"
        onCountChange={onCountChange}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة الآمنة' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('dir', 'rtl');
    expect(screen.queryByPlaceholderText(paymentId)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/اكتب رقم العملية/)).not.toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'تأكيد إعادة المحاولة' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/سبب القرار بالعربية/), {
      target: { value: 'requeue after checking the provider' },
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/سبب القرار بالعربية/), {
      target: { value: 'تمت مطابقة العملية مع لوحة ميسر وإعادة التحقق الآمن' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(mockedService.act).toHaveBeenCalledWith(
      paymentId,
      'requeue',
      'تمت مطابقة العملية مع لوحة ميسر وإعادة التحقق الآمن'
    ));
    expect(await screen.findByText(/تسجيل القرار في سجل التدقيق دون تغيير الرصيد/)).toBeInTheDocument();
    await waitFor(() => expect(onCountChange).toHaveBeenLastCalledWith(0));
  });

  test('super admin can resolve terminally with an explicit Arabic reason', async () => {
    mockedService.act.mockResolvedValue({
      payment_id: paymentId,
      action: 'resolve',
      state: 'terminal',
      next_check_at: null,
      review_action_id: 'audit-action-2',
    });
    mockedService.listReviewRequired
      .mockResolvedValueOnce(pageWith([reviewItem]))
      .mockResolvedValueOnce(pageWith([]));
    render(<GatewayReconciliationReviewQueue currentUserRole="super_admin" />);

    fireEvent.click(await screen.findByRole('button', { name: 'إغلاق المراجعة' }));
    fireEvent.change(screen.getByLabelText(/سبب القرار بالعربية/), {
      target: { value: 'تمت مراجعة كشف ميسر والسجل البنكي وإغلاق المتابعة الآلية' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إغلاق المراجعة' }));

    await waitFor(() => expect(mockedService.act).toHaveBeenCalledWith(
      paymentId,
      'resolve',
      'تمت مراجعة كشف ميسر والسجل البنكي وإغلاق المتابعة الآلية'
    ));
  });

  test('offers a retry after a dedicated queue loading failure', async () => {
    mockedService.listReviewRequired
      .mockRejectedValueOnce(new Error('تعذر تحميل قائمة مراجعة المصالحة'))
      .mockResolvedValueOnce(pageWith([reviewItem]));
    render(<GatewayReconciliationReviewQueue currentUserRole="financial_manager" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل قائمة مراجعة المصالحة');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByText('أحمد محمد الشعيل')).toBeInTheDocument();
    expect(mockedService.listReviewRequired).toHaveBeenCalledTimes(2);
  });
});

import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import React from 'react';

import { gatewayRefundService } from '../../../services/gatewayRefundService';
import PendingRefundReview from '../PendingRefundReview';

jest.mock('../../../services/gatewayRefundService', () => ({
  gatewayRefundService: {
    listPendingRefunds: jest.fn(),
    refundPendingPayment: jest.fn(),
  },
}));

const mockedService = gatewayRefundService as jest.Mocked<typeof gatewayRefundService>;

const pendingRefund = {
  id: '8b835214-56cf-438d-bab2-6f66bbf49730',
  payer_id: 'member-1',
  beneficiary_id: 'member-1',
  amount: '450.00',
  category: 'subscription',
  reference_number: 'MOY-20260810-ABCD',
  gateway_provider: 'moyasar',
  gateway_payment_id: 'pay_provider_123',
  gateway_status: 'captured',
  gateway_amount_minor: 45000,
  gateway_currency: 'SAR',
  gateway_failure_reason: 'SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE',
  gateway_verified_at: '2026-08-10T08:30:00.000Z',
  created_at: '2026-08-10T08:20:00.000Z',
  member_name: 'أحمد محمد الشعيل',
  member_phone: '0501234567',
  source_type: 'creditcard',
  source_company: 'visa',
  masked_card: '**** 4242',
  refund_operation_status: null,
  refund_attempt_count: 0,
  refund_last_error: null,
};

describe('PendingRefundReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.listPendingRefunds.mockResolvedValue({
      data: [pendingRefund],
      count: 1,
    });
  });

  test('allows a financial manager to review evidence without exposing the refund action', async () => {
    render(<PendingRefundReview currentUserRole="financial_manager" />);

    expect(await screen.findByText('أحمد محمد الشعيل')).toBeInTheDocument();
    expect(screen.getByText('pending_refund')).toBeInTheDocument();
    expect(screen.getByText(/المراجعة فقط دون تنفيذ/)).toBeInTheDocument();
    expect(screen.getByText(/خُصمت فعلياً لدى مزود الدفع/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مراجعة وتنفيذ الاسترداد' })).not.toBeInTheDocument();
    expect(screen.getByText('للعرض فقط')).toBeInTheDocument();
  });

  test('requires an exact payment ID and meaningful reason before a super admin can refund', async () => {
    const onCountChange = jest.fn();
    mockedService.refundPendingPayment.mockResolvedValue({
      success: true,
      idempotent_replay: false,
      data: {
        payment_id: pendingRefund.id,
        status: 'refunded',
        gateway_status: 'refunded',
      },
    });
    mockedService.listPendingRefunds
      .mockResolvedValueOnce({ data: [pendingRefund], count: 1 })
      .mockResolvedValueOnce({ data: [], count: 0 });

    render(<PendingRefundReview currentUserRole="super_admin" onCountChange={onCountChange} />);

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة وتنفيذ الاسترداد' }));
    const submitButton = screen.getByRole('button', { name: 'تنفيذ الاسترداد عبر ميسر' });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/سبب الاسترداد/), {
      target: { value: 'تجاوز رصيد الاشتراك الحد بعد تأكيد الخصم لدى ميسر' },
    });
    fireEvent.change(screen.getByLabelText(/اكتب رقم العملية للتأكيد/), {
      target: { value: 'wrong-payment-id' },
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/اكتب رقم العملية للتأكيد/), {
      target: { value: pendingRefund.id },
    });
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockedService.refundPendingPayment).toHaveBeenCalledWith(
      pendingRefund.id,
      {
        reason: 'تجاوز رصيد الاشتراك الحد بعد تأكيد الخصم لدى ميسر',
        confirmation_payment_id: pendingRefund.id,
      }
    ));
    expect(await screen.findByText(new RegExp(`أكدت بوابة الدفع استرداد العملية ${pendingRefund.id}`))).toBeInTheDocument();
    await waitFor(() => expect(onCountChange).toHaveBeenLastCalledWith(0));
  });

  test('shows a load failure and retries the dedicated queue endpoint', async () => {
    mockedService.listPendingRefunds
      .mockRejectedValueOnce(new Error('تعذر تحميل عمليات الاسترداد المطلوبة'))
      .mockResolvedValueOnce({ data: [pendingRefund], count: 1 });

    render(<PendingRefundReview currentUserRole="financial_manager" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل عمليات الاسترداد المطلوبة');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(await screen.findByText('أحمد محمد الشعيل')).toBeInTheDocument();
    expect(mockedService.listPendingRefunds).toHaveBeenCalledTimes(2);
  });
});

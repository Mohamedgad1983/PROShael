import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import React from 'react';

import {
  GatewayFinancialException,
  gatewayFinancialExceptionService,
} from '../../../services/gatewayFinancialExceptionService';
import GatewayFinancialExceptionsReview from '../GatewayFinancialExceptionsReview';

jest.mock('../../../services/gatewayFinancialExceptionService', () => {
  const actual = jest.requireActual('../../../services/gatewayFinancialExceptionService');
  return {
    ...actual,
    gatewayFinancialExceptionService: {
      listOpenExceptions: jest.fn(),
      reviewException: jest.fn(),
    },
  };
});

const mockedService = gatewayFinancialExceptionService as jest.Mocked<typeof gatewayFinancialExceptionService>;

const financialException: GatewayFinancialException = {
  id: 'exception-1',
  payment_id: 'payment-1',
  reference_number: 'MOY-20260810-ABCD',
  member_id: 'member-1',
  member_name: 'أحمد محمد الشعيل',
  member_phone: '0501234567',
  gateway_provider: 'moyasar',
  gateway_payment_id: 'provider-payment-1',
  provider_status: 'captured',
  exception_kind: 'partial_capture',
  expected_minor: 10000,
  actual_minor: 5000,
  currency: 'SAR',
  evidence: {
    id: 'provider-payment-1',
    status: 'captured',
    amount: 5000,
    captured: 5000,
    captured_at: '2026-08-10T08:00:00.000Z',
    source: {
      type: 'applepay',
      company: 'visa',
      number: '4242',
      reference_number: 'moyasar-safe-reference',
      response_code: '00',
      message: 'Approved',
    },
  },
  occurrence_count: 3,
  first_seen_at: '2026-08-10T08:00:00.000Z',
  last_seen_at: '2026-08-10T08:10:00.000Z',
  review_status: 'open',
};

describe('GatewayFinancialExceptionsReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.listOpenExceptions.mockResolvedValue({
      items: [financialException],
      total: 1,
    });
  });

  test('gives a financial manager a responsive evidence view without review actions or raw secrets', async () => {
    const unsafeRuntimeItem = {
      ...financialException,
      provider_response: { source: { token: 'raw-provider-secret' } },
      evidence: {
        ...financialException.evidence,
        source: {
          ...financialException.evidence.source,
          token: 'source-secret',
        },
      },
    } as GatewayFinancialException;
    mockedService.listOpenExceptions.mockResolvedValue({ items: [unsafeRuntimeItem], total: 1 });

    render(<GatewayFinancialExceptionsReview currentUserRole="financial_manager" />);

    expect(await screen.findByText('أحمد محمد الشعيل')).toBeInTheDocument();
    expect(screen.getByText('خصم جزئي')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('moyasar-safe-reference')).toBeInTheDocument();
    expect(screen.getByText(/المشاهدة فقط/)).toBeInTheDocument();
    expect(screen.getByText('للعرض فقط')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تمّت المعالجة' })).not.toBeInTheDocument();
    expect(screen.queryByText('raw-provider-secret')).not.toBeInTheDocument();
    expect(screen.queryByText('source-secret')).not.toBeInTheDocument();
  });

  test('requires meaningful Arabic notes before a super admin can resolve an exception', async () => {
    const onCountChange = jest.fn();
    mockedService.reviewException.mockResolvedValue({
      success: true,
      data: {
        item: {
          ...financialException,
          review_status: 'resolved',
          reviewed_by_name: 'المشرف العام',
          reviewed_at: '2026-08-10T09:00:00.000Z',
          review_notes: 'تمت مطابقة كشف ميسر مع القيد البنكي واعتماد المعالجة',
        },
      },
    });
    mockedService.listOpenExceptions
      .mockResolvedValueOnce({ items: [financialException], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 });

    render(
      <GatewayFinancialExceptionsReview
        currentUserRole="super_admin"
        onCountChange={onCountChange}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'تمّت المعالجة' }));
    const submitButton = screen.getByRole('button', { name: 'تأكيد اكتمال المعالجة' });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/ملاحظات المراجعة بالعربية/), {
      target: { value: 'resolved after checking the gateway' },
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/ملاحظات المراجعة بالعربية/), {
      target: { value: 'تمت مطابقة كشف ميسر مع القيد البنكي واعتماد المعالجة' },
    });
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockedService.reviewException).toHaveBeenCalledWith(
      financialException.id,
      {
        review_status: 'resolved',
        review_notes: 'تمت مطابقة كشف ميسر مع القيد البنكي واعتماد المعالجة',
      }
    ));
    expect(await screen.findByText(/تم توثيق معالجة الاستثناء المرتبط بالدفعة/)).toBeInTheDocument();
    await waitFor(() => expect(onCountChange).toHaveBeenLastCalledWith(0));
  });

  test('records dismissal with a reason through the same accessible modal', async () => {
    mockedService.reviewException.mockResolvedValue({
      success: true,
      data: {
        item: {
          ...financialException,
          review_status: 'dismissed',
          review_notes: 'الدليل مكرر وتم توثيق العملية الأصلية في سجل المراجعة',
        },
      },
    });
    mockedService.listOpenExceptions
      .mockResolvedValueOnce({ items: [financialException], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 });

    render(<GatewayFinancialExceptionsReview currentUserRole="super_admin" />);

    fireEvent.click(await screen.findByRole('button', { name: 'استبعاد مع السبب' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('dir', 'rtl');
    fireEvent.change(screen.getByLabelText(/ملاحظات المراجعة بالعربية/), {
      target: { value: 'الدليل مكرر وتم توثيق العملية الأصلية في سجل المراجعة' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الاستبعاد' }));

    await waitFor(() => expect(mockedService.reviewException).toHaveBeenCalledWith(
      financialException.id,
      {
        review_status: 'dismissed',
        review_notes: 'الدليل مكرر وتم توثيق العملية الأصلية في سجل المراجعة',
      }
    ));
  });

  test('shows a loading failure and retries the dedicated queue endpoint', async () => {
    mockedService.listOpenExceptions
      .mockRejectedValueOnce(new Error('تعذر تحميل الاستثناءات المالية'))
      .mockResolvedValueOnce({ items: [financialException], total: 1 });

    render(<GatewayFinancialExceptionsReview currentUserRole="financial_manager" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل الاستثناءات المالية');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(await screen.findByText('أحمد محمد الشعيل')).toBeInTheDocument();
    expect(mockedService.listOpenExceptions).toHaveBeenCalledTimes(2);
  });

  test('shows a reassuring empty state when no open exception remains', async () => {
    mockedService.listOpenExceptions.mockResolvedValue({ items: [], total: 0 });

    render(<GatewayFinancialExceptionsReview currentUserRole="super_admin" />);

    expect(await screen.findByText('لا توجد استثناءات مالية مفتوحة')).toBeInTheDocument();
  });
});

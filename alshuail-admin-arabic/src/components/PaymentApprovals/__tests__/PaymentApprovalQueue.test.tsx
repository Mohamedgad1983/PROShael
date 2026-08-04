import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import React from 'react';
import { paymentApprovalService } from '../../../services/paymentApproval.service';
import { getPaymentDatePreset } from '../../../utils/paymentDateRange';
import PaymentApprovalQueue from '../PaymentApprovalQueue';

jest.mock('../../../services/paymentApproval.service', () => ({
  paymentApprovalService: {
    getPendingPayments: jest.fn(),
    getPendingStats: jest.fn(),
    approvePayment: jest.fn(),
    rejectPayment: jest.fn()
  }
}));

const mockedService = paymentApprovalService as jest.Mocked<typeof paymentApprovalService>;

describe('PaymentApprovalQueue date filters', () => {
  const accessibleDateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

  const getCalendarLabel = (value: string, field: 'البداية' | 'النهاية') => {
    const [year, month, day] = value.split('-').map(Number);
    const formatted = accessibleDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
    return `اختيار ${formatted} كتاريخ ${field}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getPendingPayments.mockResolvedValue({
      success: true,
      data: [],
      count: 0
    });
    mockedService.getPendingStats.mockResolvedValue({
      success: true,
      data: {
        total_pending: 0,
        total_amount: 0,
        unique_payers: 0,
        subscription_count: 0,
        initiative_count: 0,
        diya_count: 0,
        awaiting_action: 0,
        awaiting_verification: 0
      }
    });
  });

  test('sends an inclusive custom received-date range to list and stats APIs', async () => {
    render(<PaymentApprovalQueue />);
    await waitFor(() => expect(mockedService.getPendingPayments).toHaveBeenCalled());
    const initialCalls = mockedService.getPendingPayments.mock.calls.length;
    const today = getPaymentDatePreset('today').start;
    const [year, month] = today.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-04`;

    fireEvent.click(screen.getByRole('button', { name: 'مخصص' }));
    expect(screen.queryByLabelText('من تاريخ الوصول')).not.toBeInTheDocument();
    expect(screen.getByLabelText('تقويم اختيار فترة وصول الدفعات')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('gridcell', { name: getCalendarLabel(startDate, 'البداية') }));
    fireEvent.click(screen.getByRole('gridcell', { name: getCalendarLabel(endDate, 'النهاية') }));

    expect(mockedService.getPendingPayments).toHaveBeenCalledTimes(initialCalls);
    fireEvent.click(screen.getByRole('button', { name: /تطبيق الفترة/ }));

    await waitFor(() => expect(mockedService.getPendingPayments).toHaveBeenLastCalledWith({
      category: undefined,
      start_date: startDate,
      end_date: endDate
    }));
    expect(mockedService.getPendingStats).toHaveBeenLastCalledWith({
      category: undefined,
      start_date: startDate,
      end_date: endDate
    });
  });

  test('applies the last seven Kuwait days preset and can clear it', async () => {
    render(<PaymentApprovalQueue />);
    await waitFor(() => expect(mockedService.getPendingPayments).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '7 أيام' }));
    const expected = getPaymentDatePreset('last7');

    await waitFor(() => expect(mockedService.getPendingPayments).toHaveBeenLastCalledWith({
      category: undefined,
      start_date: expected.start,
      end_date: expected.end
    }));

    fireEvent.click(screen.getByRole('button', { name: 'الكل' }));
    await waitFor(() => expect(mockedService.getPendingPayments).toHaveBeenLastCalledWith({
      category: undefined,
      start_date: undefined,
      end_date: undefined
    }));
  });
});

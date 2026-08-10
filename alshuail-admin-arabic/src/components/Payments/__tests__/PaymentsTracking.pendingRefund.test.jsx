import { fireEvent,render,screen } from '@testing-library/react';
import React from 'react';

import { useAuth } from '../../../contexts/AuthContext';
import { apiService } from '../../../services/api';
import PaymentsTracking from '../PaymentsTracking';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  apiService: {
    request: jest.fn(),
  },
}));

jest.mock('../PaymentDateFilter', () => () => <div data-testid="payment-date-filter" />);
jest.mock('../PendingRefundReview', () => ({ currentUserRole }) => (
  <div data-testid="pending-refund-review">دور المراجع: {currentUserRole}</div>
));

const mockedUseAuth = useAuth;

describe('PaymentsTracking pending-refund integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.request.mockResolvedValue({ success: true, data: [] });
  });

  test('shows the dedicated queue to a financial manager and renders it read-only by role', async () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'financial_manager', full_name: 'المدير المالي' },
      canAccessModule: () => true,
    });

    render(<PaymentsTracking />);

    const tab = await screen.findByRole('button', { name: /استردادات معلقة/ });
    fireEvent.click(tab);

    expect(screen.getByTestId('pending-refund-review')).toHaveTextContent('financial_manager');
  });

  test('does not expose the pending-refund queue to a generic admin role', async () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'admin', full_name: 'مدير' },
      canAccessModule: () => true,
    });

    render(<PaymentsTracking />);

    expect(await screen.findByText('تتبع المدفوعات')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /استردادات معلقة/ })).not.toBeInTheDocument();
  });
});

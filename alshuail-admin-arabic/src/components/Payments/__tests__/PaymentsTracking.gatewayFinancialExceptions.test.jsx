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
jest.mock('../PendingRefundReview', () => () => <div data-testid="pending-refund-review" />);
jest.mock('../GatewayFinancialExceptionsReview', () => ({ currentUserRole }) => (
  <div data-testid="gateway-financial-exceptions-review">دور المراجع: {currentUserRole}</div>
));
jest.mock('../GatewayReconciliationReviewQueue', () => ({ currentUserRole }) => (
  <div data-testid="gateway-reconciliation-review-queue">دور المصالحة: {currentUserRole}</div>
));

const mockedUseAuth = useAuth;

describe('PaymentsTracking gateway financial-exception integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.request.mockResolvedValue({ success: true, data: [] });
  });

  test('exposes the dedicated exception queue to a financial manager as a role-aware view', async () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'financial_manager', full_name: 'المدير المالي' },
      canAccessModule: () => true,
    });

    render(<PaymentsTracking />);

    const tab = await screen.findByRole('button', { name: /استثناءات مالية/ });
    fireEvent.click(tab);

    expect(screen.getByTestId('gateway-financial-exceptions-review')).toHaveTextContent('financial_manager');
  });

  test('does not expose financial exceptions to a generic admin role', async () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'admin', full_name: 'مدير' },
      canAccessModule: () => true,
    });

    render(<PaymentsTracking />);

    expect(await screen.findByText('تتبع المدفوعات')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /استثناءات مالية/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /مراجعة المصالحة/ })).not.toBeInTheDocument();
  });

  test('exposes the reconciliation review queue to financial roles inside payment tracking', async () => {
    mockedUseAuth.mockReturnValue({
      user: { role: 'financial_manager', full_name: 'المدير المالي' },
      canAccessModule: () => true,
    });

    render(<PaymentsTracking />);

    fireEvent.click(await screen.findByRole('button', { name: /مراجعة المصالحة/ }));
    expect(screen.getByTestId('gateway-reconciliation-review-queue'))
      .toHaveTextContent('financial_manager');
  });
});

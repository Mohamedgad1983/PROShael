import { render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import memberService from '../../../services/memberService';
import UnifiedMembersManagement,{ MEMBERS_VARIANTS,MembersVariant } from '../UnifiedMembersManagement';

jest.mock('../../../services/memberService', () => ({
  __esModule: true,
  default: {
    getMembersList: jest.fn(),
  },
}));

const mockMembers = [
  {
    id: '1',
    full_name: 'Ahmed Al-Mansouri',
    phone: '966501234567',
    email: 'ahmed@example.com',
    status: 'active' as const,
    profile_completed: true,
    social_security_beneficiary: false,
    registration_date: '2024-01-15',
    last_payment_date: '2024-10-15',
    total_payments: 5000,
    membership_type: 'premium' as const,
  },
  {
    id: '2',
    full_name: 'Fatima Al-Otaibi',
    phone: '966502345678',
    email: 'fatima@example.com',
    status: 'inactive' as const,
    profile_completed: false,
    social_security_beneficiary: true,
    registration_date: '2024-02-10',
    total_payments: 3000,
    membership_type: 'standard' as const,
  },
];

const mockStats = {
  total: 250,
  active: 200,
  completed_profiles: 180,
  pending_profiles: 70,
  social_security_beneficiaries: 45,
  premium_members: 80,
  total_payments: 450000,
  new_this_month: 25,
};

const getMembersListMock = memberService.getMembersList as jest.Mock;

const membersResponse = (total = mockMembers.length) => ({
  success: true,
  data: {
    members: mockMembers,
    total,
    statistics: mockStats,
  },
  pagination: { total },
});

describe('UnifiedMembersManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMembersListMock.mockResolvedValue(membersResponse());
  });

  it.each(Object.keys(MEMBERS_VARIANTS) as MembersVariant[])('renders the %s variant with member data', async (variant) => {
    render(<UnifiedMembersManagement config={MEMBERS_VARIANTS[variant]} />);

    expect(await screen.findByText('Ahmed Al-Mansouri')).toBeInTheDocument();
    expect(screen.getByText('Fatima Al-Otaibi')).toBeInTheDocument();
    expect(screen.getByText('إدارة الأعضاء')).toBeInTheDocument();
    expect(getMembersListMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: '' }),
      1,
      15
    );
  });

  it('displays statistics returned by the API', async () => {
    render(<UnifiedMembersManagement config={MEMBERS_VARIANTS.apple} />);

    expect(await screen.findByText('إجمالي الأعضاء')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('الأعضاء النشطون')).toBeInTheDocument();
    expect(screen.getByText('450,000 ر.س')).toBeInTheDocument();
  });

  it('shows export only for variants that enable it', async () => {
    const { rerender } = render(<UnifiedMembersManagement config={MEMBERS_VARIANTS.apple} />);
    expect(await screen.findByRole('button', { name: /تصدير/ })).toBeInTheDocument();

    rerender(<UnifiedMembersManagement config={MEMBERS_VARIANTS.simple} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /تصدير/ })).not.toBeInTheDocument();
    });
  });

  it('refetches with the current search query', async () => {
    render(<UnifiedMembersManagement config={MEMBERS_VARIANTS.apple} />);

    await screen.findByText('Ahmed Al-Mansouri');
    await userEvent.type(screen.getByPlaceholderText('البحث عن عضو...'), 'Ahmed');

    await waitFor(() => {
      expect(getMembersListMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Ahmed' }),
        1,
        15
      );
    });
  });

  it('requests the next page when pagination changes', async () => {
    getMembersListMock.mockResolvedValue(membersResponse(30));
    render(<UnifiedMembersManagement config={MEMBERS_VARIANTS.apple} />);

    await screen.findByText('الصفحة 1 من 2');

    await userEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));

    await waitFor(() => {
      expect(getMembersListMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: '' }),
        2,
        15
      );
    });
  });

  it('calls onMemberSelect when a member row is selected', async () => {
    const onMemberSelect = jest.fn();
    render(
      <UnifiedMembersManagement
        config={MEMBERS_VARIANTS.apple}
        onMemberSelect={onMemberSelect}
      />
    );

    const memberCell = await screen.findByText('Ahmed Al-Mansouri');
    await userEvent.click(memberCell);

    expect(onMemberSelect).toHaveBeenCalledWith(mockMembers[0]);
  });

  it('renders RTL layout and bulk selection for configured variants', async () => {
    render(<UnifiedMembersManagement config={MEMBERS_VARIANTS.apple} />);

    await screen.findByText('Ahmed Al-Mansouri');

    expect(screen.getByTestId('members-management')).toHaveAttribute('dir', 'rtl');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('renders an API error and retries on demand', async () => {
    getMembersListMock
      .mockResolvedValueOnce({ success: false, error: 'فشل في تحميل بيانات الأعضاء' })
      .mockResolvedValueOnce(membersResponse());

    render(<UnifiedMembersManagement config={MEMBERS_VARIANTS.apple} />);

    expect(await screen.findByText('فشل في تحميل بيانات الأعضاء')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => {
      expect(getMembersListMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Ahmed Al-Mansouri')).toBeInTheDocument();
  });
});

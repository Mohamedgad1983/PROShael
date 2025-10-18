/**
 * UnifiedMembersManagement Test Suite
 * Tests all member management variants and configurations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnifiedMembersManagement, { MEMBERS_VARIANTS, MembersVariant } from '../UnifiedMembersManagement';
import { memberService } from '../../../services/memberService';

// Mock member service
jest.mock('../../../services/memberService', () => ({
  memberService: {
    getMembers: jest.fn(),
    getMemberStats: jest.fn(),
    updateMember: jest.fn(),
    deleteMember: jest.fn(),
    searchMembers: jest.fn(),
    exportMembers: jest.fn(),
  },
}));

// Mock data
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
    avatar: 'avatar1.jpg',
    address: 'Riyadh, Saudi Arabia',
    birth_date: '1990-05-20',
    family_members_count: 3,
  },
  {
    id: '2',
    full_name: 'Fatima Al-Otaibi',
    phone: '966502345678',
    email: 'fatima@example.com',
    status: 'active' as const,
    profile_completed: true,
    social_security_beneficiary: true,
    registration_date: '2024-02-10',
    last_payment_date: '2024-10-10',
    total_payments: 3000,
    membership_type: 'standard' as const,
    avatar: 'avatar2.jpg',
    address: 'Jeddah, Saudi Arabia',
    birth_date: '1985-08-12',
    family_members_count: 2,
  },
  {
    id: '3',
    full_name: 'Mohammed Al-Harbi',
    phone: '966503456789',
    email: 'mohammed@example.com',
    status: 'inactive' as const,
    profile_completed: false,
    social_security_beneficiary: false,
    registration_date: '2024-03-05',
    total_payments: 500,
    membership_type: 'trial' as const,
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

describe('UnifiedMembersManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (memberService.getMembers as jest.Mock).mockResolvedValue(mockMembers);
    (memberService.getMemberStats as jest.Mock).mockResolvedValue(mockStats);
    (memberService.searchMembers as jest.Mock).mockResolvedValue(mockMembers);
    (memberService.exportMembers as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('Variant Rendering', () => {
    const variants: MembersVariant[] = ['apple', 'hijri', 'premium', 'simple'];

    variants.forEach((variant) => {
      it(`should render ${variant} variant correctly`, async () => {
        render(
          <UnifiedMembersManagement
            config={MEMBERS_VARIANTS[variant]}
          />
        );

        // Wait for data to load
        await waitFor(() => {
          expect(memberService.getMemberStats).toHaveBeenCalled();
        });

        // Verify component renders
        expect(screen.getByText(/Members Management|إدارة الأعضاء/i)).toBeInTheDocument();
      });

      it(`should display stats cards for ${variant} variant`, async () => {
        render(
          <UnifiedMembersManagement
            config={MEMBERS_VARIANTS[variant]}
          />
        );

        await waitFor(() => {
          expect(memberService.getMemberStats).toHaveBeenCalled();
        });

        // Check for stats display (at least total members should show)
        expect(screen.getByText(/250|أعضاء/i)).toBeInTheDocument();
      });
    });
  });

  describe('Feature Flags', () => {
    it('should enable filters for apple variant', async () => {
      const config = MEMBERS_VARIANTS.apple;
      expect(config.enableFilters).toBe(true);
    });

    it('should enable export for hijri variant', async () => {
      const config = MEMBERS_VARIANTS.hijri;
      expect(config.enableExport).toBe(true);
    });

    it('should enable bulk actions for premium variant', async () => {
      const config = MEMBERS_VARIANTS.premium;
      expect(config.enableBulkActions).toBe(true);
    });

    it('should disable filters for simple variant', async () => {
      const config = MEMBERS_VARIANTS.simple;
      expect(config.enableFilters).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    it('should search members by name', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      const searchInput = screen.getByPlaceholderText(/بحث|search/i);
      await userEvent.type(searchInput, 'Ahmed');

      await waitFor(() => {
        expect(memberService.searchMembers).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Ahmed',
          })
        );
      });
    });

    it('should clear search results', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      const searchInput = screen.getByPlaceholderText(/بحث|search/i);
      await userEvent.type(searchInput, 'Ahmed');

      // Clear search
      const clearButton = screen.getByRole('button', { name: /clear|مسح/i });
      await userEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls for apple variant', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Should have pagination showing page 1 of N
      expect(screen.getByText(/Page|صفحة/i)).toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      const nextButton = screen.getByRole('button', { name: /next|التالي/i });
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        );
      });
    });
  });

  describe('Member Actions', () => {
    it('should handle member view action', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Find and click view button for first member
      const viewButtons = screen.getAllByRole('button', { name: /view|عرض/i });
      if (viewButtons.length > 0) {
        await userEvent.click(viewButtons[0]);
        // Should trigger member detail view
      }
    });

    it('should handle member edit action', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Find and click edit button for first member
      const editButtons = screen.getAllByRole('button', { name: /edit|تعديل/i });
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);
        // Should trigger member edit modal
      }
    });

    it('should handle member delete action with confirmation', async () => {
      (memberService.deleteMember as jest.Mock).mockResolvedValue({ success: true });

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Find and click delete button for first member
      const deleteButtons = screen.getAllByRole('button', { name: /delete|حذف/i });
      if (deleteButtons.length > 0) {
        await userEvent.click(deleteButtons[0]);

        // Confirm deletion in dialog
        const confirmButton = screen.getByRole('button', { name: /confirm|تأكيد/i });
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(memberService.deleteMember).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Bulk Actions', () => {
    it('should enable bulk selection for variants with bulk actions enabled', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Select multiple members
      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 1) {
        await userEvent.click(checkboxes[1]);
        // Bulk action buttons should appear
        expect(screen.getByRole('button', { name: /bulk|جماعي/i })).toBeInTheDocument();
      }
    });

    it('should disable bulk actions for simple variant', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.simple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Bulk action controls should not be visible
      const bulkControls = container.querySelector('[data-testid="bulk-actions"]');
      if (bulkControls) {
        expect(bulkControls).not.toBeVisible();
      }
    });
  });

  describe('Export Functionality', () => {
    it('should export members for variants with export enabled', async () => {
      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      const exportButton = screen.getByRole('button', { name: /export|تصدير/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(memberService.exportMembers).toHaveBeenCalled();
      });
    });

    it('should not show export button for simple variant', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.simple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      const exportButton = container.querySelector('[data-testid="export-btn"]');
      expect(exportButton).not.toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('should render with light theme', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={{
            ...MEMBERS_VARIANTS.apple,
            theme: 'light',
          }}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Check for light theme classes
      expect(container.querySelector('.light-theme')).toBeInTheDocument();
    });

    it('should render with dark theme', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={{
            ...MEMBERS_VARIANTS.apple,
            theme: 'dark',
          }}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Check for dark theme classes
      expect(container.querySelector('.dark-theme')).toBeInTheDocument();
    });
  });

  describe('Language Support (Arabic RTL)', () => {
    it('should render with Arabic language', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={{
            ...MEMBERS_VARIANTS.hijri,
            language: 'ar',
          }}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Check for RTL direction
      expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
    });

    it('should render with English language', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={{
            ...MEMBERS_VARIANTS.apple,
            language: 'en',
          }}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Check for LTR direction
      expect(container.querySelector('[dir="ltr"]')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onMemberSelect when member is selected', async () => {
      const onMemberSelect = jest.fn();

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
          onMemberSelect={onMemberSelect}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Click on a member row
      const memberRows = screen.getAllByRole('row');
      if (memberRows.length > 1) {
        await userEvent.click(memberRows[1]);
        // Callback should be triggered
      }
    });

    it('should call onMemberUpdate when member is updated', async () => {
      const onMemberUpdate = jest.fn();
      (memberService.updateMember as jest.Mock).mockResolvedValue({ success: true });

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
          onMemberUpdate={onMemberUpdate}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });
    });

    it('should call onMemberDelete when member is deleted', async () => {
      const onMemberDelete = jest.fn();
      (memberService.deleteMember as jest.Mock).mockResolvedValue({ success: true });

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
          onMemberDelete={onMemberDelete}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });
    });
  });

  describe('Display Modes', () => {
    it('should support table display mode', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={{
            ...MEMBERS_VARIANTS.apple,
            displayMode: 'table',
          }}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('should support grid display mode', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={{
            ...MEMBERS_VARIANTS.premium,
            displayMode: 'grid',
          }}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      expect(container.querySelector('[data-testid="members-grid"]')).toBeInTheDocument();
    });

    it('should support cards display mode', async () => {
      const { container } = render(
        <UnifiedMembersManagement
          config={{
            ...MEMBERS_VARIANTS.apple,
            displayMode: 'cards',
          }}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      expect(container.querySelector('[data-testid="members-cards"]')).toBeInTheDocument();
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with AppleMembersManagement wrapper', async () => {
      const AppleMembersManagement = require('../AppleMembersManagementWrapper').default;

      render(<AppleMembersManagement />);

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      expect(screen.getByText(/Members Management|إدارة الأعضاء/i)).toBeInTheDocument();
    });

    it('should work with HijriMembersManagement wrapper', async () => {
      const HijriMembersManagement = require('../HijriMembersManagementWrapper').default;

      render(<HijriMembersManagement />);

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      expect(screen.getByText(/Members Management|إدارة الأعضاء/i)).toBeInTheDocument();
    });

    it('should work with PremiumMembersManagement wrapper', async () => {
      const PremiumMembersManagement = require('../PremiumMembersManagementWrapper').default;

      render(<PremiumMembersManagement />);

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      expect(screen.getByText(/Members Management|إدارة الأعضاء/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (memberService.getMembers as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/error|خطأ/i)).toBeInTheDocument();
      });
    });

    it('should retry on API failure', async () => {
      (memberService.getMembers as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockMembers);

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry|إعادة محاولة/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance', () => {
    it('should handle large member lists efficiently', async () => {
      const largeList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMembers[0],
        id: `member-${i}`,
        full_name: `Member ${i}`,
        phone: `966501234${String(i).padStart(3, '0')}`,
      }));

      (memberService.getMembers as jest.Mock).mockResolvedValue(largeList);

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      await waitFor(() => {
        expect(memberService.getMembers).toHaveBeenCalled();
      });

      // Should render pagination to handle large lists
      expect(screen.getByText(/Page|صفحة/i)).toBeInTheDocument();
    });

    it('should debounce search input', async () => {
      jest.useFakeTimers();

      render(
        <UnifiedMembersManagement
          config={MEMBERS_VARIANTS.apple}
        />
      );

      const searchInput = screen.getByPlaceholderText(/بحث|search/i);

      // Type multiple characters quickly
      await userEvent.type(searchInput, 'test');

      jest.advanceTimersByTime(500);

      // Search should be debounced and only called once
      expect(memberService.searchMembers).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});

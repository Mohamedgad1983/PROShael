/**
 * Premium Members Management Wrapper
 * Backward-compatible wrapper for PremiumMembersManagement
 * Maps to UnifiedMembersManagement with premium variant configuration
 * Includes advanced features like analytics and bulk operations
 */

import React, { useCallback } from 'react';
import UnifiedMembersManagement, { MEMBERS_VARIANTS } from './UnifiedMembersManagement';

export interface PremiumMembersManagementProps {
  onMemberSelect?: (memberId: string) => void;
  onMemberUpdate?: (memberId: string, data: any) => void;
  onMemberDelete?: (memberId: string) => void;
  enableBulkActions?: boolean;
  enableAnalytics?: boolean;
  enableAdvancedFilters?: boolean;
  [key: string]: any;
}

/**
 * PremiumMembersManagement
 * Premium variant with advanced features
 * Grid display mode, advanced filtering, bulk operations
 * Maintains backward compatibility with existing imports
 */
const PremiumMembersManagement: React.FC<PremiumMembersManagementProps> = ({
  onMemberSelect,
  onMemberUpdate,
  onMemberDelete,
  enableBulkActions = true,
  enableAnalytics = true,
  enableAdvancedFilters = true,
  ...props
}) => {
  // Adapt callbacks from memberId (string) to Member object for backward compatibility
  const handleMemberSelect = useCallback((member: any) => {
    if (onMemberSelect) {
      onMemberSelect(member.id);
    }
  }, [onMemberSelect]);

  const handleMemberUpdate = useCallback((member: any) => {
    if (onMemberUpdate) {
      onMemberUpdate(member.id, member);
    }
  }, [onMemberUpdate]);

  const handleMemberDelete = useCallback((member: any) => {
    if (onMemberDelete) {
      onMemberDelete(member.id);
    }
  }, [onMemberDelete]);

  return (
    <UnifiedMembersManagement
      config={{
        ...MEMBERS_VARIANTS.premium,
        displayMode: 'grid',
      }}
      onMemberSelect={handleMemberSelect}
      {...props}
    />
  );
};

PremiumMembersManagement.displayName = 'PremiumMembersManagement';

export default PremiumMembersManagement;
export { PremiumMembersManagement };

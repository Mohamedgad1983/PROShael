/**
 * Apple Members Management Wrapper
 * Backward-compatible wrapper for AppleMembersManagement
 * Maps to UnifiedMembersManagement with apple variant configuration
 */

import React, { useCallback } from 'react';
import UnifiedMembersManagement, { MEMBERS_VARIANTS } from './UnifiedMembersManagement';

export interface AppleMembersManagementProps {
  onMemberSelect?: (memberId: string) => void;
  onMemberUpdate?: (memberId: string, data: any) => void;
  onMemberDelete?: (memberId: string) => void;
  enableBulkActions?: boolean;
  [key: string]: any;
}

/**
 * AppleMembersManagement
 * Apple design variant for members management
 * Maintains backward compatibility with existing imports
 */
const AppleMembersManagement: React.FC<AppleMembersManagementProps> = ({
  onMemberSelect,
  onMemberUpdate,
  onMemberDelete,
  enableBulkActions = true,
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
      config={MEMBERS_VARIANTS.apple}
      onMemberSelect={handleMemberSelect}
      {...props}
    />
  );
};

AppleMembersManagement.displayName = 'AppleMembersManagement';

export default AppleMembersManagement;
export { AppleMembersManagement };

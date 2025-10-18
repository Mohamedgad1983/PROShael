/**
 * Hijri Members Management Wrapper
 * Backward-compatible wrapper for HijriMembersManagement
 * Maps to UnifiedMembersManagement with hijri variant configuration
 * Includes Hijri calendar and Islamic date support
 */

import React, { useCallback } from 'react';
import UnifiedMembersManagement, { MEMBERS_VARIANTS } from './UnifiedMembersManagement';

export interface HijriMembersManagementProps {
  onMemberSelect?: (memberId: string) => void;
  onMemberUpdate?: (memberId: string, data: any) => void;
  onMemberDelete?: (memberId: string) => void;
  enableBulkActions?: boolean;
  enableHijriDates?: boolean;
  [key: string]: any;
}

/**
 * HijriMembersManagement
 * Hijri calendar variant for members management
 * Includes Islamic date support and RTL optimization
 * Maintains backward compatibility with existing imports
 */
const HijriMembersManagement: React.FC<HijriMembersManagementProps> = ({
  onMemberSelect,
  onMemberUpdate,
  onMemberDelete,
  enableBulkActions = true,
  enableHijriDates = true,
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
        ...MEMBERS_VARIANTS.hijri,
        language: 'ar',
      }}
      onMemberSelect={handleMemberSelect}
      {...props}
    />
  );
};

HijriMembersManagement.displayName = 'HijriMembersManagement';

export default HijriMembersManagement;
export { HijriMembersManagement };

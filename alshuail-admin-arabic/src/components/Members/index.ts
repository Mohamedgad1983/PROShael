/**
 * Members Management Components Export Index
 * Centralized export for all member-related components
 */

// Main unified component
export { default as UnifiedMembersManagement } from './UnifiedMembersManagement';
export type { MembersConfig, MembersVariant } from './UnifiedMembersManagement';

// Backward compatible wrappers
export { default as AppleMembersManagement } from './AppleMembersManagementWrapper';
export type { AppleMembersManagementProps } from './AppleMembersManagementWrapper';

export { default as HijriMembersManagement } from './HijriMembersManagementWrapper';
export type { HijriMembersManagementProps } from './HijriMembersManagementWrapper';

export { default as PremiumMembersManagement } from './PremiumMembersManagementWrapper';
export type { PremiumMembersManagementProps } from './PremiumMembersManagementWrapper';

// Loading components (NEW - Phase 2)
export { default as MemberTableSkeleton } from './MemberTableSkeleton';
export { default as StatsCardSkeleton } from './StatsCardSkeleton';

// Configuration
export { MEMBERS_VARIANTS } from './UnifiedMembersManagement';

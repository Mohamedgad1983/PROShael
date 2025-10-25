/**
 * Member Helper Utilities
 * Shared business logic for member management operations
 */

import { supabase } from '../config/database.js';
import { log } from './logger.js';
import {
  MEMBER_STATUS,
  MEMBER_COLUMNS,
  ERROR_CODES,
  ERROR_MESSAGES
} from '../constants/memberConstants.js';
import { buildErrorResponse } from './memberValidation.js';

/**
 * Find a member by ID with standardized error handling
 * @param {string} memberId - The member ID to lookup
 * @param {Array<string>} columns - Columns to select (default: id, full_name, membership_status)
 * @returns {Promise<Object>} Result { success: boolean, member?: Object, error?: Object }
 */
export const findMemberById = async (memberId, columns = null) => {
  try {
    const selectColumns = columns || [
      MEMBER_COLUMNS.ID,
      MEMBER_COLUMNS.FULL_NAME,
      MEMBER_COLUMNS.MEMBERSHIP_STATUS
    ];

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select(selectColumns.join(', '))
      .eq(MEMBER_COLUMNS.ID, memberId)
      .single();

    if (memberError) {
      log.error('[MemberHelpers] Database error fetching member:', {
        error: memberError,
        memberId,
        code: memberError.code,
        details: memberError.details
      });

      return {
        success: false,
        error: buildErrorResponse(
          404,
          ERROR_CODES.MEMBER_NOT_FOUND,
          ERROR_MESSAGES.MEMBER_NOT_FOUND
        )
      };
    }

    if (!member) {
      log.warn('[MemberHelpers] Member not found:', { memberId });
      return {
        success: false,
        error: buildErrorResponse(
          404,
          ERROR_CODES.MEMBER_NOT_FOUND,
          ERROR_MESSAGES.MEMBER_NOT_FOUND
        )
      };
    }

    return { success: true, member };

  } catch (error) {
    log.error('[MemberHelpers] Unexpected error in findMemberById:', {
      error: error.message,
      stack: error.stack,
      memberId
    });

    return {
      success: false,
      error: buildErrorResponse(
        500,
        ERROR_CODES.SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR
      )
    };
  }
};

/**
 * Check if a member is currently suspended
 * @param {Object} member - The member object with membership_status
 * @returns {boolean} True if member is suspended
 */
export const isMemberSuspended = (member) => {
  return member && member[MEMBER_COLUMNS.MEMBERSHIP_STATUS] === MEMBER_STATUS.SUSPENDED;
};

/**
 * Check if a member is currently active
 * @param {Object} member - The member object with membership_status
 * @returns {boolean} True if member is active
 */
export const isMemberActive = (member) => {
  return member && member[MEMBER_COLUMNS.MEMBERSHIP_STATUS] === MEMBER_STATUS.ACTIVE;
};

/**
 * Update member status with audit trail
 * @param {string} memberId - The member ID to update
 * @param {Object} updates - The update fields
 * @returns {Promise<Object>} Result { success: boolean, member?: Object, error?: Object }
 */
export const updateMemberStatus = async (memberId, updates) => {
  try {
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        ...updates,
        [MEMBER_COLUMNS.UPDATED_AT]: new Date().toISOString()
      })
      .eq(MEMBER_COLUMNS.ID, memberId)
      .select()
      .single();

    if (updateError) {
      log.error('[MemberHelpers] Database error updating member:', {
        error: updateError,
        memberId,
        code: updateError.code,
        details: updateError.details
      });

      return {
        success: false,
        error: buildErrorResponse(
          500,
          ERROR_CODES.DATABASE_ERROR,
          ERROR_MESSAGES.DATABASE_ERROR.SUSPEND_FAILED
        )
      };
    }

    return { success: true, member: updatedMember };

  } catch (error) {
    log.error('[MemberHelpers] Unexpected error in updateMemberStatus:', {
      error: error.message,
      stack: error.stack,
      memberId
    });

    return {
      success: false,
      error: buildErrorResponse(
        500,
        ERROR_CODES.SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR
      )
    };
  }
};

/**
 * Build member response object (standardized structure)
 * @param {Object} member - The member database record
 * @param {Object} admin - The admin who performed the action
 * @param {string} type - Action type ('suspend' or 'activate')
 * @returns {Object} Formatted member response
 */
export const buildMemberResponse = (member, admin, type = 'suspend') => {
  const baseResponse = {
    id: member[MEMBER_COLUMNS.ID],
    name: member[MEMBER_COLUMNS.FULL_NAME],
    status: member[MEMBER_COLUMNS.MEMBERSHIP_STATUS]
  };

  if (type === 'suspend') {
    return {
      ...baseResponse,
      suspended_at: member[MEMBER_COLUMNS.SUSPENDED_AT],
      suspended_by: admin.email,
      suspension_reason: member[MEMBER_COLUMNS.SUSPENSION_REASON]
    };
  }

  if (type === 'activate') {
    return {
      ...baseResponse,
      reactivated_at: member[MEMBER_COLUMNS.REACTIVATED_AT],
      reactivated_by: admin.email,
      reactivation_notes: member[MEMBER_COLUMNS.REACTIVATION_NOTES]
    };
  }

  return baseResponse;
};

/**
 * Get member suspension history
 * @param {string} memberId - The member ID
 * @returns {Promise<Object>} Result { success: boolean, data?: Object, error?: Object }
 */
export const getMemberSuspensionHistory = async (memberId) => {
  try {
    const { data: member, error } = await supabase
      .from('members')
      .select(`
        ${MEMBER_COLUMNS.ID},
        ${MEMBER_COLUMNS.FULL_NAME},
        ${MEMBER_COLUMNS.MEMBERSHIP_STATUS},
        ${MEMBER_COLUMNS.SUSPENDED_AT},
        ${MEMBER_COLUMNS.SUSPENDED_BY},
        ${MEMBER_COLUMNS.SUSPENSION_REASON},
        ${MEMBER_COLUMNS.REACTIVATED_AT},
        ${MEMBER_COLUMNS.REACTIVATED_BY},
        ${MEMBER_COLUMNS.REACTIVATION_NOTES}
      `)
      .eq(MEMBER_COLUMNS.ID, memberId)
      .single();

    if (error || !member) {
      return {
        success: false,
        error: buildErrorResponse(
          404,
          ERROR_CODES.MEMBER_NOT_FOUND,
          ERROR_MESSAGES.MEMBER_NOT_FOUND
        )
      };
    }

    const data = {
      member: {
        id: member[MEMBER_COLUMNS.ID],
        name: member[MEMBER_COLUMNS.FULL_NAME],
        current_status: member[MEMBER_COLUMNS.MEMBERSHIP_STATUS]
      },
      suspension_info: member[MEMBER_COLUMNS.SUSPENDED_AT] ? {
        suspended_at: member[MEMBER_COLUMNS.SUSPENDED_AT],
        suspended_by: member[MEMBER_COLUMNS.SUSPENDED_BY],
        reason: member[MEMBER_COLUMNS.SUSPENSION_REASON],
        reactivated_at: member[MEMBER_COLUMNS.REACTIVATED_AT],
        reactivated_by: member[MEMBER_COLUMNS.REACTIVATED_BY],
        notes: member[MEMBER_COLUMNS.REACTIVATION_NOTES]
      } : null
    };

    return { success: true, data };

  } catch (error) {
    log.error('[MemberHelpers] Error in getMemberSuspensionHistory:', {
      error: error.message,
      memberId
    });

    return {
      success: false,
      error: buildErrorResponse(
        500,
        ERROR_CODES.SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR
      )
    };
  }
};

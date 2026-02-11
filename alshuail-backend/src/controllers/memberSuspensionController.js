import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import {
  MEMBER_STATUS,
  MEMBER_COLUMNS,
  ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '../constants/memberConstants.js';
import {
  validateMemberId,
  validateSuspensionReason,
  validateReactivationNotes,
  buildErrorResponse
} from '../utils/memberValidation.js';
import {
  findMemberById,
  isMemberSuspended,
  isMemberActive
} from '../utils/memberHelpers.js';

/**
 * Suspend a member (Super Admin only)
 * POST /api/members/:memberId/suspend
 */
export const suspendMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;
    const superAdmin = req.superAdmin; // From requireSuperAdmin middleware

    // HIGH #2: Validate member ID with UUID format check
    const memberIdValidation = validateMemberId(memberId);
    if (!memberIdValidation.valid) {
      return res.status(400).json({
        success: false,
        ...memberIdValidation.error
      });
    }

    // HIGH #2: Validate and sanitize suspension reason (XSS protection + length check)
    const reasonValidation = validateSuspensionReason(reason);
    if (!reasonValidation.valid) {
      return res.status(400).json({
        success: false,
        ...reasonValidation.error
      });
    }
    const sanitizedReason = reasonValidation.sanitized;

    // HIGH #1: Use reusable helper for member lookup
    const memberResult = await findMemberById(memberId);
    if (!memberResult.success) {
      return res.status(memberResult.error.status).json(memberResult.error.body);
    }
    const member = memberResult.member;

    // MEDIUM #4: Use type-safe constants instead of magic strings
    if (isMemberSuspended(member)) {
      return res.status(400).json({
        success: false,
        error: ERROR_CODES.ALREADY_SUSPENDED,
        message: ERROR_MESSAGES.ALREADY_SUSPENDED
      });
    }

    // LOW #7: Optimized single-query approach with better error handling
    const updateQuery = `
      UPDATE members
      SET
        ${MEMBER_COLUMNS.MEMBERSHIP_STATUS} = $1,
        ${MEMBER_COLUMNS.SUSPENDED_AT} = $2,
        ${MEMBER_COLUMNS.SUSPENDED_BY} = $3,
        ${MEMBER_COLUMNS.SUSPENSION_REASON} = $4,
        ${MEMBER_COLUMNS.UPDATED_AT} = $5
      WHERE ${MEMBER_COLUMNS.ID} = $6
      RETURNING *
    `;

    const now = new Date().toISOString();
    const { rows } = await query(updateQuery, [
      MEMBER_STATUS.SUSPENDED,
      now,
      superAdmin.id,
      sanitizedReason,
      now,
      memberId
    ]);

    const updatedMember = rows[0];

    if (!updatedMember) {
      // MEDIUM #5: Enhanced error logging
      log.error('[Suspend] Database error: No rows returned', {
        memberId
      });

      return res.status(500).json({
        success: false,
        error: ERROR_CODES.DATABASE_ERROR,
        message: ERROR_MESSAGES.DATABASE_ERROR.SUSPEND_FAILED
      });
    }

    log.info('[Suspend] Member suspended successfully:', {
      memberId,
      memberName: member[MEMBER_COLUMNS.FULL_NAME],
      suspendedBy: superAdmin.email,
      suspendedById: superAdmin.id,
      reason: sanitizedReason
    });

    // MEDIUM #6: Enhanced audit trail with full admin details
    res.json({
      success: true,
      message: SUCCESS_MESSAGES.MEMBER_SUSPENDED,
      data: {
        member: {
          id: updatedMember[MEMBER_COLUMNS.ID],
          name: updatedMember[MEMBER_COLUMNS.FULL_NAME],
          status: updatedMember[MEMBER_COLUMNS.MEMBERSHIP_STATUS],
          suspended_at: updatedMember[MEMBER_COLUMNS.SUSPENDED_AT],
          suspended_by: {
            id: superAdmin.id,
            email: superAdmin.email,
            role: superAdmin.role
          },
          suspension_reason: updatedMember[MEMBER_COLUMNS.SUSPENSION_REASON]
        }
      }
    });

  } catch (error) {
    log.error('[Suspend] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      memberId: req.params.memberId
    });
    res.status(500).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

/**
 * Activate a suspended member (Super Admin only)
 * POST /api/members/:memberId/activate
 */
export const activateMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { notes } = req.body;
    const superAdmin = req.superAdmin;

    // HIGH #2: Validate member ID with UUID format check
    const memberIdValidation = validateMemberId(memberId);
    if (!memberIdValidation.valid) {
      return res.status(400).json({
        success: false,
        ...memberIdValidation.error
      });
    }

    // HIGH #2: Validate and sanitize reactivation notes (optional field)
    const notesValidation = validateReactivationNotes(notes);
    if (!notesValidation.valid) {
      return res.status(400).json({
        success: false,
        ...notesValidation.error
      });
    }
    const sanitizedNotes = notesValidation.sanitized || SUCCESS_MESSAGES.DEFAULT_ACTIVATION_NOTE;

    // HIGH #1: Use reusable helper for member lookup
    const memberResult = await findMemberById(memberId);
    if (!memberResult.success) {
      return res.status(memberResult.error.status).json(memberResult.error.body);
    }
    const member = memberResult.member;

    // MEDIUM #4: Use type-safe constants instead of magic strings
    if (!isMemberSuspended(member)) {
      return res.status(400).json({
        success: false,
        error: ERROR_CODES.NOT_SUSPENDED,
        message: ERROR_MESSAGES.NOT_SUSPENDED
      });
    }

    // LOW #7: Optimized single-query approach
    const updateQuery = `
      UPDATE members
      SET
        ${MEMBER_COLUMNS.MEMBERSHIP_STATUS} = $1,
        ${MEMBER_COLUMNS.REACTIVATED_AT} = $2,
        ${MEMBER_COLUMNS.REACTIVATED_BY} = $3,
        ${MEMBER_COLUMNS.REACTIVATION_NOTES} = $4,
        ${MEMBER_COLUMNS.UPDATED_AT} = $5
      WHERE ${MEMBER_COLUMNS.ID} = $6
      RETURNING *
    `;

    const now = new Date().toISOString();
    const { rows } = await query(updateQuery, [
      MEMBER_STATUS.ACTIVE,
      now,
      superAdmin.id,
      sanitizedNotes,
      now,
      memberId
    ]);

    const updatedMember = rows[0];

    if (!updatedMember) {
      // MEDIUM #5: Enhanced error logging
      log.error('[Activate] Database error: No rows returned', {
        memberId
      });

      return res.status(500).json({
        success: false,
        error: ERROR_CODES.DATABASE_ERROR,
        message: ERROR_MESSAGES.DATABASE_ERROR.ACTIVATE_FAILED
      });
    }

    log.info('[Activate] Member activated successfully:', {
      memberId,
      memberName: member[MEMBER_COLUMNS.FULL_NAME],
      activatedBy: superAdmin.email,
      activatedById: superAdmin.id,
      notes: sanitizedNotes
    });

    // MEDIUM #6: Enhanced audit trail with full admin details
    res.json({
      success: true,
      message: SUCCESS_MESSAGES.MEMBER_ACTIVATED,
      data: {
        member: {
          id: updatedMember[MEMBER_COLUMNS.ID],
          name: updatedMember[MEMBER_COLUMNS.FULL_NAME],
          status: updatedMember[MEMBER_COLUMNS.MEMBERSHIP_STATUS],
          reactivated_at: updatedMember[MEMBER_COLUMNS.REACTIVATED_AT],
          reactivated_by: {
            id: superAdmin.id,
            email: superAdmin.email,
            role: superAdmin.role
          },
          reactivation_notes: updatedMember[MEMBER_COLUMNS.REACTIVATION_NOTES]
        }
      }
    });

  } catch (error) {
    log.error('[Activate] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      memberId: req.params.memberId
    });
    res.status(500).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

/**
 * Get suspension history for a member
 * GET /api/members/:memberId/suspension-history
 */
export const getSuspensionHistory = async (req, res) => {
  try {
    const { memberId } = req.params;

    // HIGH #2: Validate member ID
    const memberIdValidation = validateMemberId(memberId);
    if (!memberIdValidation.valid) {
      return res.status(400).json({
        success: false,
        ...memberIdValidation.error
      });
    }

    // HIGH #1: Use direct query
    const selectQuery = `
      SELECT
        ${MEMBER_COLUMNS.ID},
        ${MEMBER_COLUMNS.FULL_NAME},
        ${MEMBER_COLUMNS.MEMBERSHIP_STATUS},
        ${MEMBER_COLUMNS.SUSPENDED_AT},
        ${MEMBER_COLUMNS.SUSPENDED_BY},
        ${MEMBER_COLUMNS.SUSPENSION_REASON},
        ${MEMBER_COLUMNS.REACTIVATED_AT},
        ${MEMBER_COLUMNS.REACTIVATED_BY},
        ${MEMBER_COLUMNS.REACTIVATION_NOTES}
      FROM members
      WHERE ${MEMBER_COLUMNS.ID} = $1
    `;

    const { rows } = await query(selectQuery, [memberId]);
    const member = rows[0];

    if (!member) {
      // MEDIUM #5: Enhanced error logging
      log.error('[SuspensionHistory] Member not found:', {
        memberId
      });

      return res.status(404).json({
        success: false,
        error: ERROR_CODES.MEMBER_NOT_FOUND,
        message: ERROR_MESSAGES.MEMBER_NOT_FOUND
      });
    }

    // MEDIUM #4: Use constants for column names
    res.json({
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    log.error('[SuspensionHistory] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      memberId: req.params.memberId
    });
    res.status(500).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

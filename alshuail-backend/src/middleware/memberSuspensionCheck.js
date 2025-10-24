import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Check if member is suspended and block login
 * Use this in mobile app login endpoints
 * Must be used AFTER authenticateToken middleware
 */
export const checkMemberSuspension = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId && !userEmail) {
      return next(); // No user to check, proceed
    }

    // Find member record by user ID or email
    const { data: member, error } = await supabase
      .from('members')
      .select('id, full_name_arabic, membership_status, suspended_at, suspension_reason')
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Error other than "not found"
      log.error('[SuspensionCheck] Database error:', error);
      return next(); // Allow login on error (fail open)
    }

    // If member is suspended, block login
    if (member && member.membership_status === 'suspended') {
      log.warn('[SuspensionCheck] Suspended member attempted login:', {
        memberId: member.id,
        memberName: member.full_name_arabic,
        suspendedAt: member.suspended_at
      });

      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'تم إيقاف حسابك. للمزيد من المعلومات، يرجى التواصل مع الإدارة.',
        message_en: 'Your account has been suspended. Please contact administration.',
        suspended_at: member.suspended_at,
        reason: member.suspension_reason
      });
    }

    // Member is not suspended or doesn't exist, allow login
    next();
  } catch (error) {
    log.error('[SuspensionCheck] Unexpected error:', error);
    next(); // Allow login on unexpected error (fail open)
  }
};

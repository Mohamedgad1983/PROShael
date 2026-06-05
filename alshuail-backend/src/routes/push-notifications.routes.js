/**
 * Push Notifications Routes
 * 
 * @module push-notifications.routes
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import pushController from '../controllers/push-notifications.controller.js';

const router = express.Router();
const NOTIFICATION_ADMIN_ROLES = ['super_admin', 'admin', 'operational_manager', 'financial_manager'];
const ADMIN_ROLES = new Set(NOTIFICATION_ADMIN_ROLES);

const bindAuthenticatedMember = (req, res, next) => {
  const userId = req.user?.id || req.user?.memberId || req.user?.member_id || req.user?.user_id;
  const requestedMemberId = req.body.memberId || req.body.member_id;

  if (!ADMIN_ROLES.has(req.user?.role) && requestedMemberId && requestedMemberId !== userId) {
    return res.status(403).json({
      success: false,
      message: 'لا يمكن تسجيل جهاز لعضو آخر'
    });
  }

  req.body.memberId = requestedMemberId || userId;
  next();
};

// Register device token
router.post('/register', authenticateToken, bindAuthenticatedMember, pushController.registerDeviceToken);

// Unregister device token
router.post('/unregister', authenticateToken, pushController.unregisterDeviceToken);

// Send notification to specific member (admin only)
router.post('/send', authenticateToken, authorize(NOTIFICATION_ADMIN_ROLES), pushController.sendPushNotification);

// Broadcast to all members (admin only)
router.post('/broadcast', authenticateToken, authorize(NOTIFICATION_ADMIN_ROLES), pushController.broadcastNotification);

// Send payment reminder (admin only)
router.post('/payment-reminder', authenticateToken, authorize(NOTIFICATION_ADMIN_ROLES), pushController.sendPaymentReminder);

// Send event notification (admin only)
router.post('/event', authenticateToken, authorize(NOTIFICATION_ADMIN_ROLES), pushController.sendEventNotification);

export default router;

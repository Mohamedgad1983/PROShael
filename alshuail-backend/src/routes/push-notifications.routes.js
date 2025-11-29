/**
 * Push Notifications Routes
 * 
 * @module push-notifications.routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pushController from '../controllers/push-notifications.controller.js';

const router = express.Router();

// Register device token (public - used during login)
router.post('/register', pushController.registerDeviceToken);

// Unregister device token
router.post('/unregister', authenticateToken, pushController.unregisterDeviceToken);

// Send notification to specific member (admin only)
router.post('/send', authenticateToken, pushController.sendPushNotification);

// Broadcast to all members (admin only)
router.post('/broadcast', authenticateToken, pushController.broadcastNotification);

// Send payment reminder (admin only)
router.post('/payment-reminder', authenticateToken, pushController.sendPaymentReminder);

// Send event notification (admin only)
router.post('/event', authenticateToken, pushController.sendEventNotification);

export default router;

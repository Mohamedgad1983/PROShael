// ===============================================
// NOTIFICATION ROUTES
// File: backend/routes/notificationRoutes.js
// ===============================================

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getMemberNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

/**
 * All routes require member authentication
 */

// Get all notifications (organized by category)
router.get('/', authenticate, getMemberNotifications);

// Get notification summary (counts by category)
router.get('/summary', authenticate, getNotificationSummary);

// Mark single notification as read
router.put('/:id/read', authenticate, markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', authenticate, markAllNotificationsAsRead);

// Delete a notification
router.delete('/:id', authenticate, deleteNotification);

export default router;
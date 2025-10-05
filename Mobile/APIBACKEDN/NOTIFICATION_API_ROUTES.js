// ===============================================
// NOTIFICATION ROUTES
// File: backend/routes/notificationRoutes.js
// ===============================================

const express = require('express');
const router = express.Router();
const { authenticateMember } = require('../middleware/auth');
const {
  getMemberNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} = require('../controllers/notificationController');

/**
 * All routes require member authentication
 */

// Get all notifications (organized by category)
router.get('/', authenticateMember, getMemberNotifications);

// Get notification summary (counts by category)
router.get('/summary', authenticateMember, getNotificationSummary);

// Mark single notification as read
router.put('/:id/read', authenticateMember, markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', authenticateMember, markAllNotificationsAsRead);

// Delete a notification
router.delete('/:id', authenticateMember, deleteNotification);

module.exports = router;

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getMemberProfile,
  getMemberBalance,
  getMemberPayments,
  createPayment,
  searchMembers
} from '../controllers/memberController.js';

// Import enhanced notification functions from the new notificationController
import {
  getMemberNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Member Profile Routes
router.get('/profile', authenticate, getMemberProfile);
router.get('/balance', authenticate, getMemberBalance);

// Payment Routes
router.get('/payments', authenticate, getMemberPayments);
router.post('/payments', authenticate, createPayment);

// Member Search (for payment on behalf)
router.get('/search', authenticate, searchMembers);

// Enhanced Notification Routes (using new notificationController)
router.get('/notifications', authenticate, getMemberNotifications);
router.get('/notifications/summary', authenticate, getNotificationSummary);
router.put('/notifications/:id/read', authenticate, markNotificationAsRead);
router.put('/notifications/read-all', authenticate, markAllNotificationsAsRead);
router.delete('/notifications/:id', authenticate, deleteNotification);

export default router;
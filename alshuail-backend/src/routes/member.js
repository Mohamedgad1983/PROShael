import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getMemberProfile,
  getMemberBalance,
  getMemberPayments,
  createPayment,
  searchMembers,
  getMemberNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/memberController.js';

const router = express.Router();

// Member Profile Routes
router.get('/profile', authenticate, getMemberProfile);
router.get('/balance', authenticate, getMemberBalance);

// Payment Routes
router.get('/payments', authenticate, getMemberPayments);
router.post('/payments', authenticate, createPayment);

// Member Search (for payment on behalf)
router.get('/search', authenticate, searchMembers);

// Notification Routes
router.get('/notifications', authenticate, getMemberNotifications);
router.post('/notifications/:id/read', authenticate, markNotificationAsRead);
router.post('/notifications/read-all', authenticate, markAllNotificationsAsRead);

export default router;
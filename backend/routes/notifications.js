import express from 'express';
import {
  getAllNotifications,
  getNotificationById,
  createNotification,
  markAsRead,
  bulkMarkAsRead,
  deleteNotification,
  getMemberNotifications,
  getNotificationStats
} from '../controllers/notificationsController.js';

const router = express.Router();

// Statistics endpoint (must be before :id routes)
router.get('/stats', getNotificationStats);

// Member-specific operations (must be before :id routes)
router.get('/member/:memberId', getMemberNotifications);

// Bulk operations (must be before :id routes)
router.put('/bulk-read', bulkMarkAsRead);

// Basic CRUD Operations
router.get('/', getAllNotifications);
router.post('/', createNotification);
router.get('/:id', getNotificationById);
router.delete('/:id', deleteNotification);

// Read Management
router.put('/:id/read', markAsRead);

export default router;
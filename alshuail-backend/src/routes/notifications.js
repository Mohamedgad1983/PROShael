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
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Statistics endpoint - requires admin access
router.get('/stats', requireRole(['super_admin', 'financial_manager']), getNotificationStats);

// Member-specific operations - members can only access their own notifications
router.get('/member/:memberId',
  requireRole(['super_admin', 'member']),
  (req, res, next) => {
    // For members, only allow access to their own notifications
    if (req.user.role === 'member') {
      if (req.user.id !== req.params.memberId && req.user.membershipNumber !== req.params.memberId) {
        return res.status(403).json({ 
          success: false, 
          message: 'ليس لديك الصلاحية للوصول إلى إشعارات عضو آخر' 
        });
      }
    }
    next();
  },
  getMemberNotifications
);

// Bulk operations - requires admin access
router.put('/bulk-read', requireRole(['super_admin']), bulkMarkAsRead);

// Basic CRUD Operations
router.get('/', requireRole(['super_admin', 'financial_manager']), getAllNotifications);
router.post('/', requireRole(['super_admin', 'financial_manager']), createNotification);
router.get('/:id', requireRole(['super_admin', 'member']), getNotificationById);
router.delete('/:id', requireRole(['super_admin']), deleteNotification);

// Read Management - members can mark their own notifications as read
router.put('/:id/read',
  requireRole(['super_admin', 'member']),
  (req, res, next) => {
    // Additional check for members - they can only mark their own notifications as read
    // This would require fetching the notification first to check ownership
    // For now, we'll allow it and rely on the controller to validate
    next();
  },
  markAsRead
);

export default router;

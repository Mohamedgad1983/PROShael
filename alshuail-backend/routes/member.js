const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getMemberProfile,
  getMemberBalance,
  getMemberPayments,
  createPayment,
  searchMembers,
  getMemberNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  uploadReceipt
} = require('../controllers/memberController');

// Multer for file upload
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'));
    }
  }
});

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

// Receipt Upload Route
router.post('/receipts/upload', authenticate, upload.single('receipt'), uploadReceipt);

module.exports = router;
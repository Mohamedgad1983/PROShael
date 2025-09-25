import express from 'express';
import multer from 'multer';
import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberStatistics,
  sendRegistrationReminders,
  getIncompleteProfiles,
  addMemberManually,
  // Mobile-specific controllers
  getMemberProfile,
  getMemberBalance,
  getMemberTransactions,
  getMemberNotifications,
  updateMemberProfile
} from '../controllers/membersController.js';
import {
  importMembersFromExcel,
  getImportHistory,
  getImportBatchDetails
} from '../controllers/memberImportController.js';
import {
  verifyRegistrationToken,
  completeProfile,
  resendRegistrationToken
} from '../controllers/memberRegistrationController.js';
import { requireRole, requirePermission } from '../middleware/rbacMiddleware.js';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يجب أن يكون ملف Excel'), false);
    }
  }
});

const router = express.Router();

// Basic CRUD operations
router.get('/', getAllMembers);
router.get('/statistics', getMemberStatistics);
router.get('/incomplete-profiles', getIncompleteProfiles);
router.get('/:id', getMemberById);
router.post('/', createMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

// Admin routes for Excel import (require authentication in production)
router.post('/admin/import', upload.single('excel_file'), importMembersFromExcel);
router.get('/admin/import-history', getImportHistory);
router.get('/admin/import-batches/:batchId', getImportBatchDetails);
router.post('/admin/send-reminders', sendRegistrationReminders);
router.post('/admin/resend-token/:memberId', resendRegistrationToken);
router.post('/add-manual', addMemberManually);

// Public registration routes (no authentication required)
router.get('/verify-token/:token', verifyRegistrationToken);
router.post('/complete-profile/:token', completeProfile);

// Mobile-specific routes (require member authentication)
router.get('/mobile/profile', requireRole(['member']), getMemberProfile);
router.get('/mobile/balance', requireRole(['member']), getMemberBalance);
router.get('/mobile/transactions', requireRole(['member']), getMemberTransactions);
router.get('/mobile/notifications', requireRole(['member']), getMemberNotifications);
router.put('/mobile/profile', requireRole(['member']), updateMemberProfile);


export default router;
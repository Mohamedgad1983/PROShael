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
import { getAllMembersForMonitoring } from '../controllers/membersMonitoringController.js';
import { log } from '../utils/logger.js';
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
import { requireRole } from '../middleware/rbacMiddleware.js';

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

// Members list endpoint - requires authentication and appropriate roles
// This endpoint returns member data based on user role permissions
router.get('/', requireRole(['super_admin', 'admin', 'financial_manager']), getAllMembers);
router.get('/monitoring/all', requireRole(['super_admin', 'admin', 'financial_manager']), getAllMembersForMonitoring);
router.get('/statistics', requireRole(['super_admin', 'financial_manager']), getMemberStatistics);
router.get('/incomplete-profiles', requireRole(['super_admin', 'financial_manager']), getIncompleteProfiles);
router.get('/:id', requireRole(['super_admin', 'financial_manager', 'member']), getMemberById);
router.post('/', requireRole(['super_admin']), createMember);
router.put('/:id', requireRole(['super_admin']), updateMember);
router.delete('/:id', requireRole(['super_admin']), deleteMember);

// Admin routes for Excel import - require super admin privileges
router.post('/admin/import', requireRole(['super_admin']), upload.single('excel_file'), importMembersFromExcel);
router.get('/admin/import-history', requireRole(['super_admin']), getImportHistory);
router.get('/admin/import-batches/:batchId', requireRole(['super_admin']), getImportBatchDetails);
router.post('/admin/send-reminders', requireRole(['super_admin']), sendRegistrationReminders);
router.post('/admin/resend-token/:memberId', requireRole(['super_admin']), resendRegistrationToken);
router.post('/add-manual', requireRole(['super_admin']), addMemberManually);

// Public registration routes (no authentication required - these are for initial member registration)
router.get('/verify-token/:token', verifyRegistrationToken);
router.post('/complete-profile/:token', completeProfile);

// Mobile-specific routes (require member authentication)
router.get('/mobile/profile', requireRole(['member']), getMemberProfile);
router.get('/mobile/balance', requireRole(['member']), getMemberBalance);
router.get('/mobile/transactions', requireRole(['member']), getMemberTransactions);
router.get('/mobile/notifications', requireRole(['member']), getMemberNotifications);
router.put('/mobile/profile', requireRole(['member']), updateMemberProfile);

export default router;

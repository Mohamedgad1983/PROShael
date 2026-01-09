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
  updateMemberProfile,
  searchMembers
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

// Member search for pay-on-behalf feature - accessible by any authenticated member
router.get('/search', requireRole(['member', 'super_admin', 'admin', 'financial_manager']), searchMembers);

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

// Mobile photo upload route
router.post('/mobile/photo', requireRole(['member']), upload.single('photo'), async (req, res) => {
  try {
    const memberId = req.user?.id;

    if (!memberId) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح',
        message_en: 'Unauthorized'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم إرسال صورة',
        message_en: 'No photo uploaded'
      });
    }

    // Import supabase for storage
    const { supabase } = await import('../config/database.js');

    // Generate unique filename
    const fileExt = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `member-photos/${memberId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      log.error('Photo upload error', { error: uploadError.message, memberId });
      return res.status(500).json({
        success: false,
        error: 'فشل رفع الصورة',
        message_en: 'Failed to upload photo'
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('member-photos')
      .getPublicUrl(fileName);

    const photoUrl = urlData?.publicUrl;

    // Update member profile with new photo URL
    const { error: updateError } = await supabase
      .from('members')
      .update({ profile_image_url: photoUrl })
      .eq('id', memberId);

    if (updateError) {
      log.error('Profile update error', { error: updateError.message, memberId });
      return res.status(500).json({
        success: false,
        error: 'فشل تحديث الصورة',
        message_en: 'Failed to update photo'
      });
    }

    return res.json({
      success: true,
      data: {
        url: photoUrl
      },
      message: 'تم رفع الصورة بنجاح',
      message_en: 'Photo uploaded successfully'
    });
  } catch (error) {
    log.error('Photo upload error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'خطأ في رفع الصورة',
      message_en: 'Error uploading photo'
    });
  }
});

export default router;

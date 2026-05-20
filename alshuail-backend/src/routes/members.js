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

// Configure multer for Excel imports only. Do not reuse this for member
// photos: this filter intentionally rejects JPG/PNG/WebP.
const excelUpload = multer({
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

// Configure multer for mobile profile photos. The previous implementation
// reused the Excel-only middleware, so iOS JPEG uploads were rejected before
// the `/mobile/photo` handler ran.
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB profile photo limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]);

    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الصورة غير مدعوم. يجب أن تكون JPG أو PNG أو WebP'), false);
    }
  }
});

const handleProfilePhotoUpload = (req, res, next) => {
  profilePhotoUpload.single('photo')(req, res, (err) => {
    if (!err) {
      return next();
    }

    const isSizeError = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      success: false,
      error: isSizeError
        ? 'حجم الصورة كبير جداً. الحد الأقصى 5MB'
        : (err.message || 'تعذر قراءة الصورة'),
      message_en: isSizeError
        ? 'Photo is too large. Maximum size is 5MB'
        : 'Invalid profile photo upload'
    });
  });
};

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
router.post('/admin/import', requireRole(['super_admin']), excelUpload.single('excel_file'), importMembersFromExcel);
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
router.post('/mobile/photo', requireRole(['member']), handleProfilePhotoUpload, async (req, res) => {
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

    // Local file storage for member photos
    const { uploadToSupabase: uploadFile } = await import('../config/documentStorage.js');
    const { query: dbQuery } = await import('../services/database.js');

    // Upload file to local storage
    const uploadResult = await uploadFile(req.file, memberId, 'member-photos');

    if (!uploadResult || !uploadResult.url) {
      log.error('Photo upload error', { memberId });
      return res.status(500).json({
        success: false,
        error: 'فشل رفع الصورة',
        message_en: 'Failed to upload photo'
      });
    }

    const photoUrl = uploadResult.url;

    // Update member profile with new photo URL
    const { rows } = await dbQuery(
      'UPDATE members SET profile_image_url = $1, updated_at = $2 WHERE id = $3 RETURNING id, profile_image_url',
      [photoUrl, new Date().toISOString(), memberId]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود',
        message_en: 'Member not found'
      });
    }

    await dbQuery(
      `INSERT INTO audit_logs (user_id, user_role, action_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        memberId,
        'member',
        'profile_photo_updated',
        JSON.stringify({ profile_image_url: photoUrl })
      ]
    ).catch((auditError) => {
      log.warn('Failed to write profile photo audit log', {
        memberId,
        error: auditError.message
      });
    });

    return res.json({
      success: true,
      data: {
        url: photoUrl,
        profile_image_url: photoUrl
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

import express from 'express';
import multer from 'multer';
import { requireRole } from '../middleware/rbacMiddleware.js';
import {
  submitBankTransfer,
  getAllBankTransfers,
  getBankTransfer,
  approveTransfer,
  rejectTransfer,
  getMyTransferRequests,
  getTransferStats
} from '../controllers/bankTransfersController.js';

const router = express.Router();

// Configure multer for receipt uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG) أو ملف PDF'), false);
    }
  }
});

// Member routes - accessible by any authenticated member
// Get my transfer requests (must be before /:id route)
router.get('/my-requests', requireRole(['member', 'super_admin', 'admin', 'financial_manager']), getMyTransferRequests);

// Submit a new bank transfer request
router.post('/', requireRole(['member', 'super_admin', 'admin', 'financial_manager']), upload.single('receipt'), submitBankTransfer);

// Admin routes - require elevated permissions
// Get transfer statistics for dashboard
router.get('/stats', requireRole(['super_admin', 'admin', 'financial_manager']), getTransferStats);

// Get all bank transfer requests (admin view)
router.get('/', requireRole(['super_admin', 'admin', 'financial_manager']), getAllBankTransfers);

// Get single transfer request
router.get('/:id', requireRole(['super_admin', 'admin', 'financial_manager', 'member']), getBankTransfer);

// Approve a bank transfer request
router.put('/:id/approve', requireRole(['super_admin', 'admin', 'financial_manager']), approveTransfer);

// Reject a bank transfer request
router.put('/:id/reject', requireRole(['super_admin', 'admin', 'financial_manager']), rejectTransfer);

export default router;

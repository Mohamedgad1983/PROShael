/**
 * Loan Request Routes
 *
 * Three URL trees under one router file:
 *
 *   /api/loans/*            member-side endpoints
 *   /api/admin/loans/*      fund-staff endpoints
 *   /api/brouj/loans/*      brouj_partner endpoints
 *
 * Mounted from server.js as three separate `app.use(...)` calls so the
 * URL prefix and role gating stay explicit.
 */

import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import {
  getEligibility,
  listMyLoans,
  getMyLoan,
  createLoan,
  cancelMyLoan,
} from '../controllers/loansController.js';
import {
  listLoans,
  getLoan,
  startReview,
  approveByFund,
  rejectLoan,
  forwardToBrouj,
  recordDisbursement,
  broujUploadNajiz,
  broujConfirmFee,
} from '../controllers/adminLoansController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/;
    const okMime = allowed.test(file.mimetype);
    const okExt = allowed.test(file.originalname.toLowerCase().split('.').pop());
    cb(okMime && okExt ? null : new Error('Unsupported file type'), okMime && okExt);
  },
});

// =============================================================================
// MEMBER ROUTER  (mounted at /api/loans)
// =============================================================================
export const memberRouter = express.Router();

// Pre-form check — surfaces tunable settings + reason if blocked.
memberRouter.get('/eligibility-check', authenticateToken, requireRole(['member', 'super_admin', 'admin', 'financial_manager']), getEligibility);

// "My loans" list and detail
memberRouter.get('/me', authenticateToken, requireRole(['member', 'super_admin', 'admin', 'financial_manager']), listMyLoans);
memberRouter.get('/me/:id', authenticateToken, requireRole(['member', 'super_admin', 'admin', 'financial_manager']), getMyLoan);

// Submit a new loan with attachments
memberRouter.post(
  '/',
  authenticateToken,
  requireRole(['member', 'super_admin', 'admin', 'financial_manager']),
  upload.fields([
    { name: 'id_copy', maxCount: 1 },
    { name: 'salary_certificate', maxCount: 1 },
    { name: 'financial_statement', maxCount: 1 },
  ]),
  createLoan
);

// Cancel — only valid while still in early review.
memberRouter.delete('/:id', authenticateToken, requireRole(['member', 'super_admin', 'admin', 'financial_manager']), cancelMyLoan);

// =============================================================================
// FUND ADMIN ROUTER  (mounted at /api/admin/loans)
// =============================================================================
export const adminRouter = express.Router();

// All admin loans endpoints require staff roles.
const FUND_ROLES = ['super_admin', 'admin', 'financial_manager'];

adminRouter.get('/', authenticateToken, requireRole(FUND_ROLES), listLoans);
adminRouter.get('/:id', authenticateToken, requireRole(FUND_ROLES), getLoan);

adminRouter.post('/:id/start-review', authenticateToken, requireRole(FUND_ROLES), startReview);
adminRouter.post('/:id/approve',      authenticateToken, requireRole(FUND_ROLES), approveByFund);
adminRouter.post('/:id/reject',       authenticateToken, requireRole(FUND_ROLES), rejectLoan);
adminRouter.post('/:id/forward',      authenticateToken, requireRole(FUND_ROLES), forwardToBrouj);
adminRouter.post('/:id/disburse',     authenticateToken, requireRole(FUND_ROLES), recordDisbursement);

// =============================================================================
// BROUJ PARTNER ROUTER  (mounted at /api/brouj/loans)
// =============================================================================
// Note: list/detail are served by the same controllers as the fund admin —
// the controllers themselves apply the brouj_partner status filter. So the
// only thing different about this router is the role gate.
// =============================================================================
export const broujRouter = express.Router();

const BROUJ_ROLES = ['brouj_partner', 'super_admin']; // super_admin can impersonate for support

broujRouter.get('/', authenticateToken, requireRole(BROUJ_ROLES), listLoans);
broujRouter.get('/:id', authenticateToken, requireRole(BROUJ_ROLES), getLoan);

broujRouter.post(
  '/:id/upload-najiz',
  authenticateToken,
  requireRole(BROUJ_ROLES),
  upload.single('najiz_acknowledgment'),
  broujUploadNajiz
);

broujRouter.post(
  '/:id/confirm-fee',
  authenticateToken,
  requireRole(BROUJ_ROLES),
  upload.single('fee_receipt'),
  broujConfirmFee
);

export default { memberRouter, adminRouter, broujRouter };

/**
 * Marriage Support Routes
 *
 *   /api/marriage-support/*       member-side endpoints
 *   /api/admin/marriage-support/* committee chair + chairman endpoints
 *
 * Mounted from server.js.
 */

import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import {
  getEligibility,
  create,
  cancelMy,
} from '../controllers/marriageSupportController.js';
import {
  listRequests,
  getRequest,
  startCommitteeReview,
  linkInitiative,
  signCommittee,
  signWitness,
  reject,
  chairmanApprove,
  recordDisbursement,
} from '../controllers/adminMarriageSupportController.js';
import {
  downloadParticipantContract,
  downloadParticipantPdf,
  enterCommitteeDataSecure,
  generatePdfSecure,
  getMyParticipantRequest,
  listMyParticipantRequests,
  remindNextSigner,
  signAsParticipant,
} from '../controllers/marriageSupportParticipantController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/;
    const okMime = allowed.test(file.mimetype);
    const okExt = allowed.test(file.originalname.toLowerCase().split('.').pop());
    cb(okMime && okExt ? null : new Error('Unsupported file type'), okMime && okExt);
  },
});

// =============================================================================
// MEMBER ROUTER  (mounted at /api/marriage-support)
// =============================================================================
export const memberRouter = express.Router();

const MEMBER_ROLES = ['member', 'super_admin', 'admin', 'financial_manager', 'marriage_committee_chair', 'committee_witness'];

memberRouter.get('/eligibility-check', authenticateToken, requireRole(MEMBER_ROLES), getEligibility);
// Participant access is authorized against the request assignment itself so
// selected witnesses are not blocked by their primary JWT role.
memberRouter.get('/me',                authenticateToken, listMyParticipantRequests);
memberRouter.get('/me/:id',            authenticateToken, getMyParticipantRequest);

memberRouter.post('/',
  authenticateToken,
  requireRole(MEMBER_ROLES),
  upload.single('marriage_contract'),
  create
);

memberRouter.post('/me/:id/sign',   authenticateToken, signAsParticipant);
memberRouter.get('/:id/contract',   authenticateToken, downloadParticipantContract);
memberRouter.get('/:id/pdf',        authenticateToken, downloadParticipantPdf);
memberRouter.delete('/me/:id',      authenticateToken, requireRole(MEMBER_ROLES), cancelMy);

// =============================================================================
// ADMIN ROUTER  (mounted at /api/admin/marriage-support)
// =============================================================================
export const adminRouter = express.Router();

const COMMITTEE_ROLES = ['marriage_committee_chair', 'super_admin'];
const CHAIRMAN_ROLES = ['super_admin'];
const VIEWERS = ['marriage_committee_chair', 'super_admin', 'admin', 'financial_manager'];
const SIGN_WITNESS_ROLES = ['committee_witness', 'super_admin'];

adminRouter.get('/',     authenticateToken, requireRole(VIEWERS), listRequests);
adminRouter.get('/:id',  authenticateToken, requireRole(VIEWERS), getRequest);

// committee-chair workflow
adminRouter.post('/:id/start-review',  authenticateToken, requireRole(COMMITTEE_ROLES), startCommitteeReview);
adminRouter.post('/:id/link-initiative', authenticateToken, requireRole(COMMITTEE_ROLES), linkInitiative);
adminRouter.post('/:id/enter-data',    authenticateToken, requireRole(COMMITTEE_ROLES), enterCommitteeDataSecure);
adminRouter.post('/:id/generate-pdf',  authenticateToken, requireRole(COMMITTEE_ROLES), generatePdfSecure);
adminRouter.post('/:id/sign-committee', authenticateToken, requireRole(COMMITTEE_ROLES), signCommittee);
adminRouter.post('/:id/sign-witness',   authenticateToken, requireRole(SIGN_WITNESS_ROLES), signWitness);
adminRouter.post('/:id/remind-next-signer', authenticateToken, requireRole(COMMITTEE_ROLES), remindNextSigner);
adminRouter.post('/:id/reject',        authenticateToken, requireRole([...COMMITTEE_ROLES, ...CHAIRMAN_ROLES]), reject);

// chairman workflow
adminRouter.post('/:id/chairman-approve', authenticateToken, requireRole(CHAIRMAN_ROLES), chairmanApprove);
adminRouter.post('/:id/disburse',         authenticateToken, requireRole(CHAIRMAN_ROLES), recordDisbursement);

export default { memberRouter, adminRouter };

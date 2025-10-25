import express from 'express';
import {
  suspendMember,
  activateMember,
  getSuspensionHistory
} from '../controllers/memberSuspensionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/superAdminAuth.js';
import { requireAdminOrSelf } from '../middleware/requireAdminOrSelf.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/members/:memberId/suspend
 * @desc    Suspend a member (Super Admin only)
 * @access  Super Admin
 */
router.post('/:memberId/suspend', requireSuperAdmin, suspendMember);

/**
 * @route   POST /api/members/:memberId/activate
 * @desc    Activate a suspended member (Super Admin only)
 * @access  Super Admin
 */
router.post('/:memberId/activate', requireSuperAdmin, activateMember);

/**
 * @route   GET /api/members/:memberId/suspension-history
 * @desc    Get suspension history for a member
 * @access  Admin OR Member (self only)
 * @security HIGH #3: Added authorization - Admins can view any, members can view only their own
 */
router.get('/:memberId/suspension-history', requireAdminOrSelf, getSuspensionHistory);

export default router;

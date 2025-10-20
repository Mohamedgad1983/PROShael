// Member Approval Routes
import express from 'express';
import * as approvalController from '../controllers/approval.controller.js';
import { requireRole, requirePermission, ROLES, PERMISSIONS } from '../middleware/rbac.middleware.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Approval endpoints
router.get('/pending',
  protect,
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  approvalController.getPendingApprovals
);

router.get('/:memberId',
  protect,
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  approvalController.getMemberForApproval
);

router.post('/:memberId/approve',
  protect,
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  approvalController.approveMember
);

router.post('/:memberId/reject',
  protect,
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  approvalController.rejectMember
);

router.get('/stats',
  protect,
  approvalController.getApprovalStats
);

export default router;

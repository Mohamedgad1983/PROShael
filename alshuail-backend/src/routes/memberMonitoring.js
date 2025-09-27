import express from 'express';
import {
  getMemberMonitoring,
  suspendMember,
  notifyMember,
  getAuditLog,
  exportMembers
} from '../controllers/memberMonitoringController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Get member monitoring dashboard data - allow all authenticated users for now
// TODO: Re-enable role check: requireRole(['super_admin', 'financial_manager'])
router.get('/', getMemberMonitoring);

// Export member data with filters - requires financial manager or super admin access
router.get('/export', requireRole(['super_admin', 'financial_manager']), exportMembers);

// Get audit log for compliance tracking - requires super admin access
router.get('/audit-log', requireRole(['super_admin']), getAuditLog);

// Suspend a member - requires super admin or finance manager privileges
router.post('/:id/suspend', requireRole(['super_admin', 'financial_manager']), suspendMember);

// Send notification to a member - requires admin privileges
router.post('/:id/notify', requireRole(['super_admin', 'financial_manager']), notifyMember);

export default router;

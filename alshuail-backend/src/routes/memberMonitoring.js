import express from 'express';
import {
  getMemberMonitoring,
  suspendMember,
  notifyMember,
  getAuditLog,
  exportMembers
} from '../controllers/memberMonitoringController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get member monitoring dashboard data - simplified authentication
router.get('/', authenticateToken, getMemberMonitoring);

// Export member data with filters - simplified authentication
router.get('/export', authenticateToken, exportMembers);

// Get audit log for compliance tracking - simplified authentication
router.get('/audit-log', authenticateToken, getAuditLog);

// Suspend a member - simplified authentication
router.post('/:id/suspend', authenticateToken, suspendMember);

// Send notification to a member - simplified authentication
router.post('/:id/notify', authenticateToken, notifyMember);

export default router;

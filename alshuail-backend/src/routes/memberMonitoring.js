import express from 'express';
import {
  getMemberMonitoring,
  suspendMember,
  notifyMembers,
  getAuditLog,
  exportMembers
} from '../controllers/memberMonitoringController.js';
import { authenticateToken } from '../middleware/auth.js';

// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${duration}`);
  }
  next();
};

const router = express.Router();

// Get member monitoring dashboard data - simplified authentication
router.get('/', cacheMiddleware(300), authenticateToken, getMemberMonitoring);

// Export member data with filters - simplified authentication
router.get('/export', cacheMiddleware(300), authenticateToken, exportMembers);

// Get audit log for compliance tracking - simplified authentication
router.get('/audit-log', cacheMiddleware(300), authenticateToken, getAuditLog);

// Suspend a member - simplified authentication
router.post('/:id/suspend', authenticateToken, suspendMember);

// Send notification to a member - simplified authentication
router.post('/:id/notify', authenticateToken, notifyMembers);

export default router;

// Statement Routes for Dynamic Member Management System
import express from 'express';
import statementController from '../controllers/statementController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Search endpoints - require authentication
router.get('/search/phone', requireRole(['super_admin', 'financial_manager', 'member']), statementController.searchByPhone);
router.get('/search/name', requireRole(['super_admin', 'financial_manager', 'member']), statementController.searchByName);
router.get('/search/member-id', requireRole(['super_admin', 'financial_manager', 'member']), statementController.searchByMemberId);

// Statement generation - requires ownership or admin privileges
router.get('/generate/:memberId',
  requireRole(['super_admin', 'financial_manager', 'member']),
  (req, res, next) => {
    // For members, only allow access to their own statement
    if (req.user.role === 'member') {
      if (req.user.id !== req.params.memberId && req.user.membershipNumber !== req.params.memberId) {
        return res.status(403).json({ 
          success: false, 
          message: 'ليس لديك الصلاحية لإنشاء كشف حساب لعضو آخر' 
        });
      }
    }
    next();
  },
  statementController.generateStatement
);

export default router;

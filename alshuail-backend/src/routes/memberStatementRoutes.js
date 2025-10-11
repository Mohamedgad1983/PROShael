import express from 'express';
import { searchMemberStatement, getMemberStatement, getAllMembersWithBalances } from '../controllers/memberStatementController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Search for members - requires authentication
router.get('/search', requireRole(['super_admin', 'financial_manager', 'member']), searchMemberStatement);

// Get specific member statement - requires ownership or admin privileges
router.get('/member/:memberId',
  requireRole(['super_admin', 'financial_manager', 'member']),
  (req, res, next) => {
    // For members, only allow access to their own statement
    if (req.user.role === 'member') {
      if (req.user.id !== req.params.memberId && req.user.membershipNumber !== req.params.memberId) {
        return res.status(403).json({ 
          success: false, 
          message: 'ليس لديك الصلاحية للوصول إلى كشف حساب عضو آخر' 
        });
      }
    }
    next();
  },
  getMemberStatement
);

// Get all members with balances - requires financial manager or super admin access
router.get('/all-balances', requireRole(['super_admin', 'financial_manager']), getAllMembersWithBalances);

export default router;

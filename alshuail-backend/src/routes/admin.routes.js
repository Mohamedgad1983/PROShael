// Admin Management Routes
import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireRole, requirePermission, ROLES, PERMISSIONS } from '../middleware/rbacMiddleware.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Admin endpoints
router.post('/members',
  protect,
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  requirePermission(PERMISSIONS.MANAGE_MEMBERS),
  adminController.addMember
);

router.put('/members/:memberId/subdivision',
  protect,
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  requirePermission(PERMISSIONS.MANAGE_MEMBERS),
  adminController.assignSubdivision
);

router.get('/subdivisions',
  protect,
  adminController.getSubdivisions
);

router.get('/dashboard/stats',
  protect,
  adminController.getDashboardStats
);

export default router;

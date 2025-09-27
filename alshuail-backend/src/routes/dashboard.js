import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Dashboard statistics - requires admin or financial manager access
router.get('/stats', requireRole(['super_admin', 'financial_manager']), getDashboardStats);

export default router;

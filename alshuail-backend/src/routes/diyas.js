import express from 'express';
import {
  getAllDiyas,
  getDiyaById,
  createDiya,
  updateDiyaStatus,
  updateDiya,
  deleteDiya,
  getDiyaStats,
  getMemberDiyas,
  transferDiyaToExpense,
  bulkTransferDiyasToExpenses
} from '../controllers/diyasController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const financialManagers = ['super_admin', 'admin', 'financial_manager', 'occasions_initiatives_diyas_admin'];

// Statistics endpoint (must be before :id routes)
router.get('/stats', authenticateToken, authorize(financialManagers), getDiyaStats);

// Member-specific operations (must be before :id routes)
router.get('/member/:memberId', authenticateToken, getMemberDiyas);

// Basic CRUD Operations
router.get('/', authenticateToken, getAllDiyas);
router.post('/', authenticateToken, authorize(financialManagers), createDiya);
router.get('/:id', authenticateToken, getDiyaById);
router.put('/:id', authenticateToken, authorize(financialManagers), updateDiya);
router.delete('/:id', authenticateToken, authorize(financialManagers), deleteDiya);

// Status Management
router.put('/:id/status', authenticateToken, authorize(financialManagers), updateDiyaStatus);

// Transfer to Expenses (Internal Diyas)
router.post('/bulk-transfer-to-expenses', authenticateToken, authorize(financialManagers), bulkTransferDiyasToExpenses);
router.post('/:id/transfer-to-expense', authenticateToken, authorize(financialManagers), transferDiyaToExpense);

export default router;

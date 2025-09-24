import express from 'express';
import {
  getAllDiyas,
  getDiyaById,
  createDiya,
  updateDiyaStatus,
  updateDiya,
  deleteDiya,
  getDiyaStats,
  getMemberDiyas
} from '../controllers/diyasController.js';

const router = express.Router();

// Statistics endpoint (must be before :id routes)
router.get('/stats', getDiyaStats);

// Member-specific operations (must be before :id routes)
router.get('/member/:memberId', getMemberDiyas);

// Basic CRUD Operations
router.get('/', getAllDiyas);
router.post('/', createDiya);
router.get('/:id', getDiyaById);
router.put('/:id', updateDiya);
router.delete('/:id', deleteDiya);

// Status Management
router.put('/:id/status', updateDiyaStatus);

export default router;
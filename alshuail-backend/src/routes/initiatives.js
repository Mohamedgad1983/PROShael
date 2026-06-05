
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `private, max-age=${duration}`);
  }
  next();
};
import express from 'express';
import {
  getAllInitiatives,
  getInitiativeById,
  createInitiative,
  addContribution,
  updateContributionStatus,
  updateInitiative,
  getInitiativeStats
} from '../controllers/initiativesController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const contentManagers = ['super_admin', 'admin', 'financial_manager', 'operational_manager', 'occasions_initiatives_diyas_admin'];

// Statistics endpoint (must be before :id routes)
router.get('/stats', authenticateToken, authorize(contentManagers), cacheMiddleware(300), getInitiativeStats);

// Basic CRUD Operations
router.get('/', authenticateToken, cacheMiddleware(300), getAllInitiatives);
router.post('/', authenticateToken, authorize(contentManagers), createInitiative);
router.get('/:id', authenticateToken, cacheMiddleware(300), getInitiativeById);
router.put('/:id', authenticateToken, authorize(contentManagers), updateInitiative);

// Contribution Management
router.post('/:id/contribute', authenticateToken, addContribution);
router.put('/:id/contributions/:contributionId', authenticateToken, authorize(contentManagers), updateContributionStatus);

export default router;

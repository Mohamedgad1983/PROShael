
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${duration}`);
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

const router = express.Router();

// Statistics endpoint (must be before :id routes)
router.get('/stats', cacheMiddleware(300), getInitiativeStats);

// Basic CRUD Operations
router.get('/', cacheMiddleware(300), getAllInitiatives);
router.post('/', createInitiative);
router.get('/:id', cacheMiddleware(300), getInitiativeById);
router.put('/:id', updateInitiative);

// Contribution Management
router.post('/:id/contribute', addContribution);
router.put('/:id/contributions/:contributionId', updateContributionStatus);

export default router;
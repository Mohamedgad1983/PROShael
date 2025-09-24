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
router.get('/stats', getInitiativeStats);

// Basic CRUD Operations
router.get('/', getAllInitiatives);
router.post('/', createInitiative);
router.get('/:id', getInitiativeById);
router.put('/:id', updateInitiative);

// Contribution Management
router.post('/:id/contribute', addContribution);
router.put('/:id/contributions/:contributionId', updateContributionStatus);

export default router;
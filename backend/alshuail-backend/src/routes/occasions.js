import express from 'express';
import {
  getAllOccasions,
  getOccasionById,
  createOccasion,
  updateRSVP,
  updateOccasion,
  deleteOccasion,
  getOccasionStats
} from '../controllers/occasionsController.js';

const router = express.Router();

// Statistics endpoint (must be before :id routes)
router.get('/stats', getOccasionStats);

// Basic CRUD Operations
router.get('/', getAllOccasions);
router.post('/', createOccasion);
router.get('/:id', getOccasionById);
router.put('/:id', updateOccasion);
router.delete('/:id', deleteOccasion);

// RSVP Management
router.put('/:id/rsvp', updateRSVP);

export default router;
import express from 'express';
import {
  getAllOccasions,
  getOccasionById,
  createOccasion,
  updateRSVP,
  updateOccasion,
  deleteOccasion,
  getOccasionStats,
  getOccasionAttendees
} from '../controllers/occasionsController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const contentManagers = ['super_admin', 'admin', 'operational_manager', 'occasions_initiatives_diyas_admin'];

// Statistics endpoint (must be before :id routes)
router.get('/stats', authenticateToken, authorize(contentManagers), getOccasionStats);

// Basic CRUD Operations
router.get('/', authenticateToken, getAllOccasions);
router.post('/', authenticateToken, authorize(contentManagers), createOccasion);
router.get('/:id', authenticateToken, getOccasionById);
router.put('/:id', authenticateToken, authorize(contentManagers), updateOccasion);
router.delete('/:id', authenticateToken, authorize(contentManagers), deleteOccasion);

// RSVP Management
router.put('/:id/rsvp', authenticateToken, updateRSVP);
router.get('/:id/attendees', authenticateToken, authorize(contentManagers), getOccasionAttendees);

export default router;

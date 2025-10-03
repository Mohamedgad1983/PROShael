import express from 'express';
import {
    getAllActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity,
    getActivityStatistics
} from '../controllers/activitiesController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// Public Routes (No authentication required)
// ============================================================

// Get all activities
router.get('/', getAllActivities);

// Get activity statistics
router.get('/statistics', getActivityStatistics);

// Get single activity details
router.get('/:id', getActivityById);

// ============================================================
// Protected Routes (Authentication required)
// ============================================================

// Create new activity (Authenticated users)
router.post('/', authenticate, createActivity);

// Update activity (Authenticated users)
router.put('/:id', authenticate, updateActivity);

// Delete activity (Authenticated users)
router.delete('/:id', authenticate, deleteActivity);

export default router;
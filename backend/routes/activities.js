const express = require('express');
const router = express.Router();
const {
    getAllActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity,
    getActivityStatistics
} = require('../controllers/activitiesController');
const { authenticate } = require('../middleware/auth');

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

module.exports = router;
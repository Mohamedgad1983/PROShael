import express from 'express';
import { getCrisisDashboard, updateMemberBalance } from '../controllers/crisisController.js';

const router = express.Router();

// Get crisis dashboard data (PUBLIC - no auth required for local testing)
router.get('/dashboard', getCrisisDashboard);

// Update member balance (when payment is made)
router.post('/update-balance', updateMemberBalance);

export default router;
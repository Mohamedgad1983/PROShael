import express from 'express';
import {
  getCrisisDashboard,
  updateMemberBalance,
  getCrisisAlerts,
  markMemberSafe,
  getEmergencyContacts
} from '../controllers/crisisController.js';
import { authenticateToken, requireAdmin, requireFinancialManager } from '../middleware/auth.js';

const router = express.Router();

// Get crisis dashboard data
router.get('/dashboard', authenticateToken, requireAdmin, getCrisisDashboard);

// Update member balance (when payment is made)
router.post('/update-balance', authenticateToken, requireFinancialManager, updateMemberBalance);

// Mobile Crisis Management Endpoints
router.get('/', authenticateToken, getCrisisAlerts); // Get active crisis and history
router.post('/safe', authenticateToken, markMemberSafe); // Member marks themselves safe
router.get('/contacts', authenticateToken, getEmergencyContacts); // Get emergency contacts list

export default router;

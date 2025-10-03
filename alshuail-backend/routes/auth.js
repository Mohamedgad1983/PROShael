import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import {
    login,
    getProfile,
    logout,
    verifyToken,
    getTableStructure,
    changePassword
} from '../controllers/authController.js';

const router = express.Router();

// Authentication routes
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);
router.get('/verify', authenticate, verifyToken);

// Password management
router.post('/change-password', authenticate, changePassword);

// Development only - get table structure
router.get('/table-structure', getTableStructure);

export default router;
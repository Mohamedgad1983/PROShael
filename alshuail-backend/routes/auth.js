const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
    login,
    getProfile,
    logout,
    verifyToken,
    getTableStructure
} = require('../controllers/authController');

// Authentication routes
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);
router.get('/verify', authenticate, verifyToken);

// Development only - get table structure
router.get('/table-structure', getTableStructure);

module.exports = router;
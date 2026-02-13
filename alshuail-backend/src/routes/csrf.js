/**
 * CSRF Token Route
 * Provides CSRF tokens to the frontend for form submissions
 */

import express from 'express';
import { generateCSRFToken } from '../middleware/csrf.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/csrf-token
 * Generates and returns a CSRF token for the client
 * @returns {Object} CSRF token and cookie information
 */
router.get('/csrf-token', generateCSRFToken, (req, res) => {
  try {
    const token = req.csrfToken();

    res.json({
      success: true,
      csrfToken: token,
      message: 'CSRF token generated successfully',
      expiresIn: 3600 // 1 hour in seconds
    });
  } catch (error) {
    log.error('CSRF token endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate security token'
    });
  }
});

/**
 * POST /api/csrf-token/validate
 * Test endpoint to validate CSRF token
 * Used for testing CSRF protection
 */
router.post('/csrf-token/validate', (req, res) => {
  // If we reach here, CSRF validation passed
  res.json({
    success: true,
    message: 'CSRF token is valid',
    timestamp: new Date().toISOString()
  });
});

export default router;

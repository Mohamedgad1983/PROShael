
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `private, max-age=${duration}`);
  }
  next();
};
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
import { authenticateToken, authorize } from '../middleware/auth.js';
import { upload } from '../config/documentStorage.js';
import { initiativeContributionLimiter } from '../middleware/apiRateLimiters.js';

const router = express.Router();
const contentManagers = ['super_admin', 'admin', 'financial_manager', 'operational_manager', 'occasions_initiatives_diyas_admin'];

const contributionReceiptUpload = (req, res, next) => {
  upload.single('receipt')(req, res, (error) => {
    if (!error) {
      return next();
    }

    const isSizeError = error.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      success: false,
      error: isSizeError
        ? 'حجم صورة الإيصال أكبر من الحد المسموح (10 ميجابايت)'
        : 'صيغة الإيصال غير مدعومة. استخدم JPG أو PNG أو WebP أو PDF.'
    });
  });
};

// Statistics endpoint (must be before :id routes)
router.get('/stats', authenticateToken, authorize(contentManagers), cacheMiddleware(300), getInitiativeStats);

// Basic CRUD Operations
router.get('/', authenticateToken, cacheMiddleware(300), getAllInitiatives);
router.post('/', authenticateToken, authorize(contentManagers), createInitiative);
router.get('/:id', authenticateToken, cacheMiddleware(300), getInitiativeById);
router.put('/:id', authenticateToken, authorize(contentManagers), updateInitiative);

// Contribution Management
router.post(
  '/:id/contribute',
  authenticateToken,
  initiativeContributionLimiter,
  contributionReceiptUpload,
  addContribution
);
router.put('/:id/contributions/:contributionId', authenticateToken, authorize(contentManagers), updateContributionStatus);

export default router;

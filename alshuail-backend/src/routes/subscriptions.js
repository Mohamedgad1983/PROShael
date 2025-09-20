import express from 'express';

const router = express.Router();

// Basic subscription routes - placeholder for future implementation
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Subscriptions endpoint - coming soon'
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Subscription creation - coming soon'
  });
});

export default router;
import express from 'express';

const router = express.Router();

// Basic notifications routes - placeholder for future implementation
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Notifications endpoint - coming soon'
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Notification creation - coming soon'
  });
});

export default router;
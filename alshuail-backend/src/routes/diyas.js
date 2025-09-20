import express from 'express';

const router = express.Router();

// Basic diyas routes - placeholder for future implementation
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Diyas endpoint - coming soon'
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Diya creation - coming soon'
  });
});

export default router;
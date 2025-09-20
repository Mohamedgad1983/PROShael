import express from 'express';

const router = express.Router();

// Basic occasions routes - placeholder for future implementation
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Occasions endpoint - coming soon'
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Occasion creation - coming soon'
  });
});

export default router;
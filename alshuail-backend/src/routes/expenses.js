import express from 'express';

const router = express.Router();

// Basic expenses routes - placeholder for future implementation
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Expenses endpoint - coming soon'
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Expense creation - coming soon'
  });
});

export default router;
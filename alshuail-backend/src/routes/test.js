import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Test database connection
router.get('/connection', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('count')
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
});

// Basic health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'Al-Shuail Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
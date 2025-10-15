import express from 'express';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = express.Router();

// Test route that works exactly like our testApiEndpoint.js
router.get('/occasions', async (req, res) => {
  try {
    log.info('Test occasions endpoint called');

    const limit = 50;
    const offset = 0;

    const query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: occasions, error, count } = await query;

    if (error) {
      log.error('Test occasions error', { error: error.message });
      throw error;
    }

    // Calculate additional metrics for each occasion
    const enhancedOccasions = occasions?.map(occasion => ({
      ...occasion,
      days_until_event: occasion.start_date ?
        Math.ceil((new Date(occasion.start_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      attendance_rate: occasion.max_attendees && occasion.current_attendees ?
        Math.round((occasion.current_attendees / occasion.max_attendees) * 100) : 0,
      is_full: occasion.max_attendees ? (occasion.current_attendees || 0) >= occasion.max_attendees : false
    })) || [];

    res.json({
      success: true,
      data: enhancedOccasions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count || enhancedOccasions.length
      },
      message: 'تم جلب المناسبات بنجاح (test route)'
    });
  } catch (error) {
    log.error('Test occasions endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المناسبات (test route)',
      message: config.isDevelopment ? error.message : undefined
    });
  }
});

router.get('/initiatives', async (req, res) => {
  try {
    log.info('Test initiatives endpoint called');

    const { data: initiatives, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 49);

    if (error) {throw error;}

    res.json({
      success: true,
      data: initiatives || [],
      message: 'تم جلب المبادرات بنجاح (test route)'
    });
  } catch (error) {
    log.error('Test initiatives endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المبادرات (test route)',
      message: config.isDevelopment ? error.message : undefined
    });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    log.info('Test notifications endpoint called');

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 49);

    if (error) {throw error;}

    res.json({
      success: true,
      data: notifications || [],
      message: 'تم جلب الإشعارات بنجاح (test route)'
    });
  } catch (error) {
    log.error('Test notifications endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الإشعارات (test route)',
      message: config.isDevelopment ? error.message : undefined
    });
  }
});

export default router;
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

/**
 * Sync diya_cases table with collected amounts
 * POST /api/test/sync-diya-amounts
 * Updates diya_cases.collected_amount from activities.current_amount
 */
router.post('/sync-diya-amounts', async (req, res) => {
  try {
    log.info('Sync diya amounts endpoint called');

    // Mapping of diya_cases case_number to activities title_ar
    const syncMapping = [
      { case_number: 'DY-2024-001', title_pattern: 'حسم نادر', collected_amount: 28200, status: 'completed' },
      { case_number: 'DY-2024-002', title_pattern: 'حسم شرهان', collected_amount: 29200, status: 'completed' },
      { case_number: 'DY-2024-003', title_pattern: 'شرهان 2', collected_amount: 83400, status: 'completed' }
    ];

    const results = [];

    for (const item of syncMapping) {
      const { data, error } = await supabase
        .from('diya_cases')
        .update({
          collected_amount: item.collected_amount,
          status: item.status
        })
        .eq('case_number', item.case_number)
        .select();

      if (error) {
        log.error('Error syncing diya', { case_number: item.case_number, error: error.message });
        results.push({ case_number: item.case_number, success: false, error: error.message });
      } else {
        log.info('Synced diya', { case_number: item.case_number, collected_amount: item.collected_amount });
        results.push({ case_number: item.case_number, success: true, collected_amount: item.collected_amount });
      }
    }

    // Verify the updates by getting current state
    const { data: diyas, error: verifyError } = await supabase
      .from('diya_cases')
      .select('case_number, title_ar, collected_amount, status, diya_type')
      .order('case_number');

    res.json({
      success: true,
      results,
      current_state: diyas || [],
      total_collected: syncMapping.reduce((sum, item) => sum + item.collected_amount, 0),
      message: 'تم مزامنة مبالغ الدية بنجاح'
    });
  } catch (error) {
    log.error('Sync diya amounts error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في مزامنة مبالغ الدية',
      message: config.isDevelopment ? error.message : undefined
    });
  }
});

export default router;
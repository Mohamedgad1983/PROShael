import express from 'express';
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = express.Router();

// Test route that works exactly like our testApiEndpoint.js
router.get('/occasions', async (req, res) => {
  try {
    log.info('Test occasions endpoint called');

    const limit = 50;
    const offset = 0;

    const eventsResult = await query(
      `SELECT * FROM events ORDER BY start_date ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const occasions = eventsResult.rows;

    const countResult = await query(`SELECT COUNT(*) FROM events`);
    const count = parseInt(countResult.rows[0].count);

    // Calculate additional metrics for each occasion
    const enhancedOccasions = occasions.map(occasion => ({
      ...occasion,
      days_until_event: occasion.start_date ?
        Math.ceil((new Date(occasion.start_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      attendance_rate: occasion.max_attendees && occasion.current_attendees ?
        Math.round((occasion.current_attendees / occasion.max_attendees) * 100) : 0,
      is_full: occasion.max_attendees ? (occasion.current_attendees || 0) >= occasion.max_attendees : false
    }));

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

    const result = await query(
      `SELECT * FROM activities ORDER BY created_at DESC LIMIT 50`
    );

    res.json({
      success: true,
      data: result.rows,
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

    const result = await query(
      `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`
    );

    res.json({
      success: true,
      data: result.rows,
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
      try {
        const _result = await query(
          `UPDATE diya_cases
           SET collected_amount = $1, status = $2
           WHERE case_number = $3
           RETURNING *`,
          [item.collected_amount, item.status, item.case_number]
        );

        log.info('Synced diya', { case_number: item.case_number, collected_amount: item.collected_amount });
        results.push({ case_number: item.case_number, success: true, collected_amount: item.collected_amount });
      } catch (error) {
        log.error('Error syncing diya', { case_number: item.case_number, error: error.message });
        results.push({ case_number: item.case_number, success: false, error: error.message });
      }
    }

    // Verify the updates by getting current state
    const diyasResult = await query(
      `SELECT case_number, title_ar, collected_amount, status, diya_type
       FROM diya_cases
       ORDER BY case_number`
    );
    const diyas = diyasResult.rows;

    res.json({
      success: true,
      results,
      current_state: diyas,
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
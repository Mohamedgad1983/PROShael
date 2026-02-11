/**
 * Optimized Member Monitoring Routes
 * High-performance routes with advanced filtering
 */

import express from 'express';
import { query } from '../services/database.js';
import {
  getMemberMonitoring,
  getDashboardStatistics,
  exportMembers,
  getMemberDetailsById,
  searchMembers,
  getTribalSections,
  suspendMember,
  reactivateMember,
  notifyMembers,
  getAuditLog
} from '../controllers/memberMonitoringControllerOptimized.js';

const router = express.Router();

// ==============================
// QUERY ROUTES
// ==============================

/**
 * GET /api/member-monitoring
 * Get members with advanced filtering
 *
 * Query params:
 * - memberId: Member ID search
 * - fullName: Arabic name search
 * - phone: Phone number search
 * - tribalSection: Tribal section filter
 * - balanceOperator: <, >, =, between, compliant, non-compliant, critical, excellent
 * - balanceAmount: Amount for comparison
 * - balanceMin/Max: Range for between
 * - status: active, suspended
 * - page: Page number
 * - limit: Items per page
 * - sortBy: Sort field
 * - sortOrder: asc/desc
 */
router.get('/', getMemberMonitoring);

/**
 * GET /api/member-monitoring/statistics
 * Get dashboard statistics with caching
 *
 * Query params:
 * - refresh: true to force refresh cache
 */
router.get('/statistics', getDashboardStatistics);

/**
 * GET /api/member-monitoring/export
 * Export filtered members data
 *
 * Accepts same filters as main monitoring endpoint
 */
router.get('/export', exportMembers);

/**
 * GET /api/member-monitoring/search
 * Search members with autocomplete
 *
 * Query params:
 * - q: Search term (min 2 characters)
 * - limit: Max results (default 10)
 */
router.get('/search', searchMembers);

/**
 * GET /api/member-monitoring/tribal-sections
 * Get tribal sections with member counts
 */
router.get('/tribal-sections', getTribalSections);

/**
 * GET /api/member-monitoring/:id
 * Get detailed member information with payment history
 */
router.get('/:id', getMemberDetailsById);

// ==============================
// ACTION ROUTES
// ==============================

/**
 * POST /api/member-monitoring/:id/suspend
 * Suspend a member
 *
 * Body:
 * - reason: Suspension reason (required)
 * - adminId: Admin performing action
 */
router.post('/:id/suspend', suspendMember);

/**
 * POST /api/member-monitoring/:id/reactivate
 * Reactivate a suspended member
 *
 * Body:
 * - adminId: Admin performing action
 * - notes: Optional notes
 */
router.post('/:id/reactivate', reactivateMember);

/**
 * POST /api/member-monitoring/notify
 * Send notifications to multiple members
 *
 * Body:
 * - memberIds: Array of member IDs
 * - type: Notification type
 * - title: Notification title
 * - message: Notification message (required)
 * - channel: sms, app, or both (default both)
 */
router.post('/notify', notifyMembers);

// ==============================
// AUDIT & COMPLIANCE
// ==============================

/**
 * GET /api/member-monitoring/audit/logs
 * Get audit log with filtering
 *
 * Query params:
 * - page: Page number
 * - limit: Items per page
 * - action_type: Filter by action
 * - target_type: Filter by target
 * - performed_by: Filter by user
 * - start_date: Filter from date
 * - end_date: Filter to date
 */
router.get('/audit/logs', getAuditLog);

// ==============================
// HEALTH CHECK
// ==============================

/**
 * GET /api/member-monitoring/health
 * Check service health and performance
 */
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();

    // Test database connection
    await query(`SELECT COUNT(*) FROM members LIMIT 1`);

    const queryTime = Date.now() - startTime;

    res.json({
      success: true,
      status: 'healthy',
      performance: {
        databaseResponseTime: `${queryTime}ms`,
        optimal: queryTime < 300
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
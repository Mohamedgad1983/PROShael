
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${duration}`);
  }
  next();
};
import express from 'express';
import { query } from '../services/database.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Get all subscriptions - requires financial access
router.get('/', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM subscriptions`
    );
    const count = parseInt(countResult.rows[0].count);

    // Get paginated subscriptions
    const result = await query(
      `SELECT * FROM subscriptions
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const subscriptions = result.rows;

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      data: subscriptions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الاشتراكات'
    });
  }
});

// Create new subscription - requires financial manager access
router.post('/', requireRole(['super_admin', 'financial_manager']), async (req, res) => {
  try {
    const subscriptionData = req.body;

    if (subscriptionData.amount < 50) {
      return res.status(400).json({
        success: false,
        error: 'الحد الأدنى للاشتراك 50 ريال'
      });
    }

    if (subscriptionData.amount % 50 !== 0) {
      return res.status(400).json({
        success: false,
        error: 'المبلغ يجب أن يكون من مضاعفات الـ 50 ريال'
      });
    }

    const result = await query(
      `INSERT INTO subscriptions (
        member_id, amount, subscription_type, start_date, end_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        subscriptionData.member_id,
        subscriptionData.amount,
        subscriptionData.subscription_type,
        subscriptionData.start_date,
        subscriptionData.end_date,
        subscriptionData.status || 'active'
      ]
    );
    const subscription = result.rows[0];

    res.status(201).json({
      success: true,
      data: subscription,
      message: 'تم إنشاء الاشتراك بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء الاشتراك'
    });
  }
});

export default router;

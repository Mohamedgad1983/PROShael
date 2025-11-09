
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${duration}`);
  }
  next();
};
import express from 'express';
import { supabase } from '../config/database.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Get all subscriptions - requires financial access
router.get('/', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data: subscriptions, error, count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {throw error;}

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total: count || subscriptions.length,
        pages: Math.ceil((count || subscriptions.length) / limit)
      },
      data: subscriptions || []
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

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single();

    if (error) {throw error;}

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

import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: subscriptions || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الاشتراكات'
    });
  }
});

router.post('/', async (req, res) => {
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

    if (error) throw error;

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
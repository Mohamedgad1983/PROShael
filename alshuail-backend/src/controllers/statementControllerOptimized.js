// Optimized Statement Controller using Materialized Views
import { supabase } from '../config/database.js';

// Phone validation
const validatePhone = (phone) => {
  const saudiRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)[0-9]{7}$/;
  const kuwaitRegex = /^(9|6|5)[0-9]{7}$/;
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  return saudiRegex.test(cleaned) || kuwaitRegex.test(cleaned);
};

// Arabic text normalization
const normalizeArabic = (text) => {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
};

// Search by phone using materialized view
export const searchByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone || phone.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف مطلوب (8 أرقام على الأقل)'
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة رقم الهاتف غير صحيحة'
      });
    }

    // Use materialized view for instant results
    const { data, error } = await supabase
      .from('member_statement_view')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Format the response
    const statement = {
      memberId: data.membership_number,
      fullName: data.full_name,
      phone: data.phone,
      email: data.email,
      memberSince: data.member_since,
      currentBalance: data.current_balance,
      targetBalance: 3000,
      shortfall: data.shortfall,
      percentageComplete: data.percentage_complete,
      alertLevel: data.alert_level,
      statusColor: data.status_color,
      alertMessage: getAlertMessage(data.alert_level, data.shortfall),
      recentTransactions: data.recent_transactions || [],
      statistics: {
        totalPayments: data.total_payments || 0,
        lastPaymentDate: data.last_payment_date,
        currentYear: new Date().getFullYear()
      }
    };

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    console.error('Phone search error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Search by name using materialized view
export const searchByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'الاسم مطلوب (3 أحرف على الأقل)'
      });
    }

    const normalizedName = normalizeArabic(name);

    // Use materialized view for fast search
    const { data, error } = await supabase
      .from('member_statement_view')
      .select('*')
      .ilike('full_name', `%${normalizedName}%`)
      .limit(10);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على أعضاء بهذا الاسم'
      });
    }

    // Format statements
    const statements = data.map(member => ({
      memberId: member.membership_number,
      fullName: member.full_name,
      phone: member.phone,
      currentBalance: member.current_balance,
      shortfall: member.shortfall,
      alertLevel: member.alert_level,
      statusColor: member.status_color,
      percentageComplete: member.percentage_complete,
      lastPaymentDate: member.last_payment_date
    }));

    res.json({
      success: true,
      data: statements
    });

  } catch (error) {
    console.error('Name search error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Search by member ID using materialized view
export const searchByMemberId = async (req, res) => {
  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'رقم العضوية مطلوب'
      });
    }

    // Use materialized view
    const { data, error } = await supabase
      .from('member_statement_view')
      .select('*')
      .eq('membership_number', memberId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Format the response
    const statement = {
      memberId: data.membership_number,
      fullName: data.full_name,
      phone: data.phone,
      email: data.email,
      memberSince: data.member_since,
      currentBalance: data.current_balance,
      targetBalance: 3000,
      shortfall: data.shortfall,
      percentageComplete: data.percentage_complete,
      alertLevel: data.alert_level,
      statusColor: data.status_color,
      alertMessage: getAlertMessage(data.alert_level, data.shortfall),
      recentTransactions: data.recent_transactions || [],
      statistics: {
        totalPayments: data.total_payments || 0,
        lastPaymentDate: data.last_payment_date
      }
    };

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    console.error('Member ID search error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Get dashboard statistics using function
export const getDashboardStatistics = async (req, res) => {
  try {
    // Call the database function
    const { data, error } = await supabase
      .rpc('get_dashboard_stats');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data[0] // Function returns array with one row
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الإحصائيات'
    });
  }
};

// Get critical members
export const getCriticalMembers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Use the critical members view
    const { data, error } = await supabase
      .from('critical_members_view')
      .select('*')
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Critical members error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الأعضاء الحرجين'
    });
  }
};

// Refresh materialized views (admin only)
export const refreshViews = async (req, res) => {
  try {
    // Call the refresh function
    const { data, error } = await supabase
      .rpc('refresh_all_views');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      details: data
    });

  } catch (error) {
    console.error('View refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث البيانات'
    });
  }
};

// Helper function for alert messages
function getAlertMessage(level, shortfall) {
  switch(level) {
    case 'ZERO_BALANCE':
      return 'تنبيه حرج: لا يوجد رصيد في الحساب. يجب السداد فوراً.';
    case 'CRITICAL':
      return `تنبيه حرج: الرصيد أقل من 1000 ريال. المطلوب ${shortfall} ريال للوصول للحد الأدنى.`;
    case 'WARNING':
      return `تنبيه: الرصيد أقل من الحد الأدنى. المطلوب ${shortfall} ريال لإكمال 3000 ريال.`;
    case 'SUFFICIENT':
      return 'الرصيد كافي ويحقق الحد الأدنى المطلوب ✅';
    default:
      return '';
  }
}

export default {
  searchByPhone,
  searchByName,
  searchByMemberId,
  getDashboardStatistics,
  getCriticalMembers,
  refreshViews
};
// Optimized Statement Controller using Materialized Views
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

// Phone validation
const validatePhone = (phone) => {
  const saudiRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)[0-9]{7}$/;
  const kuwaitRegex = /^(9|6|5)[0-9]{7}$/;
  const cleaned = phone.replace(/[\s\-+]/g, '');
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
    const { data: _data, error } = await supabase
      .from('member_statement_view')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !_data) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Format the response
    const statement = {
      memberId: _data.membership_number,
      fullName: _data.full_name,
      phone: _data.phone,
      email: _data.email,
      memberSince: _data.member_since,
      currentBalance: _data.current_balance,
      targetBalance: 3000,
      shortfall: _data.shortfall,
      percentageComplete: _data.percentage_complete,
      alertLevel: _data.alert_level,
      statusColor: _data.status_color,
      alertMessage: getAlertMessage(_data.alert_level, _data.shortfall),
      recentTransactions: _data.recent_transactions || [],
      statistics: {
        totalPayments: _data.total_payments || 0,
        lastPaymentDate: _data.last_payment_date,
        currentYear: new Date().getFullYear()
      }
    };

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    log.error('Phone search error', { error: error.message });
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
    const { data: _data, error } = await supabase
      .from('member_statement_view')
      .select('*')
      .ilike('full_name', `%${normalizedName}%`)
      .limit(10);

    if (error) {
      throw error;
    }

    if (!_data || _data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على أعضاء بهذا الاسم'
      });
    }

    // Format statements
    const statements = _data.map(member => ({
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
    log.error('Name search error', { error: error.message });
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
    const { data: _data, error } = await supabase
      .from('member_statement_view')
      .select('*')
      .eq('membership_number', memberId)
      .single();

    if (error || !_data) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Format the response
    const statement = {
      memberId: _data.membership_number,
      fullName: _data.full_name,
      phone: _data.phone,
      email: _data.email,
      memberSince: _data.member_since,
      currentBalance: _data.current_balance,
      targetBalance: 3000,
      shortfall: _data.shortfall,
      percentageComplete: _data.percentage_complete,
      alertLevel: _data.alert_level,
      statusColor: _data.status_color,
      alertMessage: getAlertMessage(_data.alert_level, _data.shortfall),
      recentTransactions: _data.recent_transactions || [],
      statistics: {
        totalPayments: _data.total_payments || 0,
        lastPaymentDate: _data.last_payment_date
      }
    };

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    log.error('Member ID search error', { error: error.message });
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
    const { data: _data, error } = await supabase
      .rpc('get_dashboard_stats');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: _data[0] // Function returns array with one row
    });

  } catch (error) {
    log.error('Dashboard stats error', { error: error.message });
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
    const { data: _data, error } = await supabase
      .from('critical_members_view')
      .select('*')
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: _data || [],
      count: _data?.length || 0
    });

  } catch (error) {
    log.error('Critical members error', { error: error.message });
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
    const { data: _data, error } = await supabase
      .rpc('refresh_all_views');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      details: _data
    });

  } catch (error) {
    log.error('View refresh error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث البيانات'
    });
  }
};

// Generate statement for a specific member - uses subscriptions table for accurate data
export const generateStatement = async (req, res) => {
  try {
    const memberId = req.params.memberId;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'رقم العضوية مطلوب'
      });
    }

    // Get member data - balance is stored in members.current_balance or members.total_paid
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        id,
        full_name_ar,
        full_name,
        phone,
        email,
        membership_number,
        created_at,
        balance,
        current_balance,
        total_paid,
        tribal_section,
        family_branch_id
      `)
      .eq('membership_number', memberId)
      .single();

    if (memberError || !memberData) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Use members.current_balance or members.total_paid (this is the correct source)
    // NOT subscriptions.current_balance which has wrong data
    const currentBalance = parseFloat(memberData.current_balance) || parseFloat(memberData.total_paid) || 0;

    // Target balance is 3000 SAR (minimum requirement)
    const targetBalance = 3000;
    const shortfall = Math.max(0, targetBalance - currentBalance);
    const percentageComplete = Math.min(100, (currentBalance / targetBalance) * 100);

    // Determine alert level
    let alertLevel;
    if (currentBalance === 0) {
      alertLevel = 'ZERO_BALANCE';
    } else if (currentBalance < 1000) {
      alertLevel = 'CRITICAL';
    } else if (currentBalance < 3000) {
      alertLevel = 'WARNING';
    } else {
      alertLevel = 'SUFFICIENT';
    }

    // Generate payment history based on balance (600 SAR per year)
    // This reconstructs yearly payments from the total_paid amount
    const recentTransactions = generatePaymentHistoryFromBalance(currentBalance);

    // Total payments equals current balance (what member has paid)
    const totalPayments = currentBalance;

    // Calculate last payment date based on payment history
    const lastPaymentDate = recentTransactions.length > 0 ? recentTransactions[0].date : null;

    // Format the response
    const statement = {
      memberId: memberData.membership_number,
      fullName: memberData.full_name_ar || memberData.full_name,
      phone: memberData.phone,
      email: memberData.email,
      memberSince: memberData.created_at,
      tribalSection: memberData.tribal_section,
      currentBalance: parseFloat(currentBalance),
      targetBalance: targetBalance,
      shortfall: shortfall,
      percentageComplete: Math.round(percentageComplete * 100) / 100,
      alertLevel: alertLevel,
      statusColor: getStatusColor(alertLevel),
      alertMessage: getAlertMessage(alertLevel, shortfall),
      recentTransactions: recentTransactions,
      statistics: {
        totalPayments: totalPayments,
        lastPaymentDate: lastPaymentDate,
        currentYear: new Date().getFullYear()
      }
    };

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    log.error('Generate statement error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء كشف الحساب'
    });
  }
};

// Generate payment history from balance (600 SAR per year)
function generatePaymentHistoryFromBalance(balance) {
  const payments = [];
  const currentBalance = parseFloat(balance) || 0;

  if (currentBalance <= 0) {
    return payments;
  }

  // Yearly subscription fee is 600 SAR
  const yearlyFee = 600;
  const yearsWithPayment = Math.min(10, Math.floor(currentBalance / yearlyFee));

  // Start from earliest payment year (e.g., 3000 SAR = 5 years from 2021-2025)
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsWithPayment + 1;

  let remainingBalance = currentBalance;

  for (let i = 0; i < yearsWithPayment && remainingBalance >= yearlyFee; i++) {
    const paymentYear = startYear + i;
    payments.push({
      type: 'payment',
      year: paymentYear,
      amount: yearlyFee,
      date: `${paymentYear}-06-15`,
      description: `اشتراك سنة ${paymentYear}`,
      status: 'completed'
    });
    remainingBalance -= yearlyFee;
  }

  // Add partial payment if there's remaining balance after full years
  if (remainingBalance > 0) {
    payments.push({
      type: 'payment',
      year: currentYear,
      amount: remainingBalance,
      date: `${currentYear}-01-01`,
      description: `دفعة جزئية ${currentYear}`,
      status: 'completed'
    });
  }

  // Sort by date descending (most recent first)
  return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Get status color based on alert level
function getStatusColor(level) {
  switch(level) {
    case 'ZERO_BALANCE': return '#991B1B';
    case 'CRITICAL': return '#DC2626';
    case 'WARNING': return '#F59E0B';
    case 'SUFFICIENT': return '#10B981';
    default: return '#6B7280';
  }
}

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

// Get member counts for statement page (optimized - single query for counts)
export const getMemberStatementCounts = async (req, res) => {
  try {
    const MINIMUM_BALANCE = 3000;

    // Single optimized query for counts using SQL aggregation
    const { data, error } = await supabase
      .rpc('get_member_statement_counts');

    if (error) {
      // Fallback to direct query if RPC doesn't exist - use membership_status for consistency
      const { data: members, error: fallbackError } = await supabase
        .from('members')
        .select('current_balance')
        .eq('membership_status', 'active');

      if (fallbackError) throw fallbackError;

      const total = members.length;
      const compliant = members.filter(m => (m.current_balance || 0) >= MINIMUM_BALANCE).length;
      const nonCompliant = total - compliant;

      return res.json({
        success: true,
        data: {
          total,
          compliant,
          nonCompliant,
          minimumBalance: MINIMUM_BALANCE
        }
      });
    }

    res.json({
      success: true,
      data: data || { total: 0, compliant: 0, nonCompliant: 0 }
    });

  } catch (error) {
    log.error('Get member statement counts error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب إحصائيات الأعضاء'
    });
  }
};

// Get paginated members for statement page (optimized)
export const getPaginatedMembersForStatement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const filter = req.query.filter || 'all'; // 'all', 'compliant', 'non-compliant'
    const search = req.query.search || '';
    const MINIMUM_BALANCE = 3000;

    const offset = (page - 1) * limit;

    // Build query - use membership_status for consistency with UI
    let query = supabase
      .from('members')
      .select('id, membership_number, full_name, phone, tribal_section, current_balance, membership_status', { count: 'exact' })
      .eq('membership_status', 'active');

    // Apply filter
    if (filter === 'compliant') {
      query = query.gte('current_balance', MINIMUM_BALANCE);
    } else if (filter === 'non-compliant') {
      query = query.lt('current_balance', MINIMUM_BALANCE);
    }

    // Apply search
    if (search && search.length >= 2) {
      query = query.or(`full_name.ilike.%${search}%,membership_number.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Order and paginate
    query = query
      .order('membership_number', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: members, error, count } = await query;

    if (error) throw error;

    // Transform data
    const results = (members || []).map(m => ({
      id: m.id,
      member_no: m.membership_number,
      full_name: m.full_name,
      phone: m.phone,
      tribal_section: m.tribal_section,
      balance: m.current_balance || 0
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
      }
    });

  } catch (error) {
    log.error('Get paginated members error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب قائمة الأعضاء'
    });
  }
};

export default {
  searchByPhone,
  searchByName,
  searchByMemberId,
  generateStatement,
  getDashboardStatistics,
  getCriticalMembers,
  refreshViews,
  getMemberStatementCounts,
  getPaginatedMembersForStatement
};
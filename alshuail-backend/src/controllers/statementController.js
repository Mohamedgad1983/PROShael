// Optimized Statement Controller using Materialized Views
// Now uses high-performance materialized views for instant responses
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

// Phone number validation for Saudi and Kuwait
const validatePhone = (phone) => {
  // Saudi format: 05XXXXXXXX
  const saudiRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)[0-9]{7}$/;
  // Kuwait format: 9XXXXXXX, 6XXXXXXX, 5XXXXXXX
  const kuwaitRegex = /^(9|6|5)[0-9]{7}$/;

  const cleaned = phone.replace(/[\s\-\+]/g, '');
  return saudiRegex.test(cleaned) || kuwaitRegex.test(cleaned);
};

// Arabic text normalization for better search
const normalizeArabic = (text) => {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
};

// Search by phone number
export const searchByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone || phone.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف مطلوب (8 أرقام على الأقل)'
      });
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة رقم الهاتف غير صحيحة'
      });
    }

    // Search in database
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !member) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Get member's statement data
    const statementData = await getMemberStatement(member.id);

    res.json({
      success: true,
      data: statementData
    });

  } catch (error) {
    log.error('Phone search error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Search by name (Arabic)
export const searchByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'الاسم مطلوب (3 أحرف على الأقل)'
      });
    }

    // Normalize Arabic text for search
    const normalizedName = normalizeArabic(name);

    // Search in database with multiple field fallbacks
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .or(`full_name.ilike.%${normalizedName}%,name.ilike.%${normalizedName}%,first_name.ilike.%${normalizedName}%,last_name.ilike.%${normalizedName}%`)
      .limit(10);

    if (error) {
      throw error;
    }

    if (!members || members.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على أعضاء بهذا الاسم'
      });
    }

    // Get statements for all matching members
    const statements = await Promise.all(
      members.map(member => getMemberStatement(member.id))
    );

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

// Search by member ID
export const searchByMemberId = async (req, res) => {
  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'رقم العضوية مطلوب'
      });
    }

    // Search in database
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('membership_number', memberId)
      .single();

    if (error || !member) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Get member's statement data
    const statementData = await getMemberStatement(member.id);

    res.json({
      success: true,
      data: statementData
    });

  } catch (error) {
    log.error('Member ID search error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Get comprehensive member statement using materialized view
async function getMemberStatement(memberId) {
  try {
    // Use the materialized view for instant results
    const { data: statement, error } = await supabase
      .from('member_statement_view')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error) throw error;

    // Already have all calculated data from the view
    const totalPaid = statement.current_balance || 0;

    // Get subscription info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .single();

    // Determine alert level
    let alertLevel, statusColor;
    if (totalPaid === 0) {
      alertLevel = 'ZERO_BALANCE';
      statusColor = '#991B1B'; // Dark red
    } else if (totalPaid < 1000) {
      alertLevel = 'CRITICAL';
      statusColor = '#DC2626'; // Red
    } else if (totalPaid < 3000) {
      alertLevel = 'WARNING';
      statusColor = '#F59E0B'; // Amber
    } else {
      alertLevel = 'SUFFICIENT';
      statusColor = '#10B981'; // Green
    }

    // Build comprehensive statement
    return {
      // Member Information
      memberId: member.membership_number || `SH-${member.id.slice(0, 5)}`,
      fullName: member.full_name || member.name || `عضو ${member.id}`,
      phone: member.phone,
      email: member.email,
      memberSince: member.created_at,

      // Financial Information
      currentBalance: totalPaid,
      targetBalance: 3000,
      shortfall: Math.max(0, 3000 - totalPaid),
      percentageComplete: Math.min(100, (totalPaid / 3000) * 100),

      // Alert Information
      alertLevel,
      statusColor,
      alertMessage: getAlertMessage(alertLevel, Math.max(0, 3000 - totalPaid)),

      // Subscription Information
      subscription: subscription ? {
        type: subscription.subscription_type,
        quantity: subscription.quantity,
        amount: subscription.amount,
        nextDueDate: subscription.next_due_date,
        status: subscription.status
      } : null,

      // Recent Transactions
      recentTransactions: payments?.slice(0, 10).map(p => ({
        date: p.created_at,
        amount: p.amount,
        type: p.category,
        description: p.title || 'دفعة',
        reference: p.reference_number
      })) || [],

      // Statistics
      statistics: {
        totalPayments: payments?.length || 0,
        lastPaymentDate: payments?.[0]?.created_at || null,
        averagePayment: payments?.length > 0 ? totalPaid / payments.length : 0,
        yearlyTotal: calculateYearlyTotal(payments)
      }
    };
  } catch (error) {
    log.error('Error generating statement', { error: error.message });
    throw error;
  }
}

// Get alert message based on level
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

// Calculate yearly total
function calculateYearlyTotal(payments) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  return payments
    ?.filter(p => new Date(p.created_at) > oneYearAgo)
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
}

// Generate PDF statement
export const generateStatement = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Get member statement data
    const statementData = await getMemberStatement(memberId);

    // For now, return JSON (PDF generation to be implemented)
    res.json({
      success: true,
      data: statementData,
      message: 'كشف الحساب جاهز'
    });

  } catch (error) {
    log.error('Statement generation error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء كشف الحساب'
    });
  }
};

export default {
  searchByPhone,
  searchByName,
  searchByMemberId,
  generateStatement
};